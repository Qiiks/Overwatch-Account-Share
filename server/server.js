const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const listEndpoints = require('express-list-endpoints');
const debugLog = require('./middleware/debugLog');
const authRoutes = require('./routes/auth');
const overwatchAccountRoutes = require('./routes/overwatchAccount');
const emailServiceRoutes = require('./routes/emailService');
const emailRoutes = require('./routes/email');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const googleAuthRoutes = require('./routes/googleAuth');
const settingsRoutes = require('./routes/settings');
const { supabase } = require('./config/db');
const { startOtpFetching } = require('./services/otpService');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const errorHandler = require('./middleware/errorMiddleware');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter, authLimiter, speedLimiter, passwordResetLimiter, adminLimiter } = require('./middleware/rateLimiter');
const { httpLogger, logger, performanceLogger, securityLogger } = require('./utils/logger');
const { performanceMonitor, memoryMonitor } = require('./middleware/performanceMonitor');
const { sanitizeInput, sqlInjectionProtection, requestSizeLimiter } = require('./middleware/inputSanitizer');
const { connectRedis, cache } = require('./utils/cache');

const app = express();

app.set('trust proxy', 1);

// Simple health check endpoint (before middleware for quick response)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// HTTPS setup
let server;
try {
  const key = fs.readFileSync(process.env.SSL_KEY_PATH || 'server.key');
  const cert = fs.readFileSync(process.env.SSL_CERT_PATH || 'server.cert');
  server = https.createServer({ key, cert }, app);
  console.log('HTTPS server enabled');
} catch (err) {
  server = http.createServer(app);
  console.warn('HTTPS certs not found, falling back to HTTP');
}

// SIMPLIFIED CORS CONFIGURATION - PRODUCTION FIX
// Define allowed origins with clear priority
const allowedOrigins = [
  // Production URLs (highest priority)
  'https://overwatch.qiikzx.dev',
  'https://bwgg4wow8kggc48kko0g080c.qiikzx.dev',
  // Development URLs
  'http://localhost:3000',
  'http://localhost:5001',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
];

// Add additional origins from environment if specified
if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  allowedOrigins.push(...envOrigins);
}

// Remove duplicates and empty strings
const uniqueOrigins = [...new Set(allowedOrigins.filter(Boolean))];

console.log('[CORS] Configured allowed origins:');
uniqueOrigins.forEach(origin => console.log(`  - ${origin}`));

// CRITICAL FIX: Simplified CORS middleware with explicit origin handling
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (server-to-server, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in our allowed list
    if (uniqueOrigins.includes(origin)) {
      console.log(`[CORS] ✅ Origin allowed: ${origin}`);
      return callback(null, origin); // Return the specific origin, not just true
    }
    
    console.error(`[CORS] ❌ Origin blocked: ${origin}`);
    console.error(`[CORS] Expected one of: ${uniqueOrigins.join(', ')}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  optionsSuccessStatus: 200
};

// Apply CORS middleware ONCE
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Socket.IO configuration with matching CORS settings
const io = new Server(server, {
  cors: {
    origin: uniqueOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'], // Allow both transports
  pingTimeout: 60000,
  pingInterval: 25000
});

// Log Socket.IO configuration
console.log('[Socket.IO] Configured with origins:', uniqueOrigins);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        ...uniqueOrigins,
        ...uniqueOrigins.map(origin => origin.replace('http://', 'ws://').replace('https://', 'wss://'))
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false
}));
app.disable('x-powered-by');

// Response compression middleware
app.use(compression());

// IMPORTANT: Body parser must come early in the middleware stack
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging middleware
app.use(httpLogger);

// Performance monitoring middleware
app.use(performanceMonitor);

// Input sanitization and security middleware
app.use(sanitizeInput);
app.use(sqlInjectionProtection);
app.use(requestSizeLimiter);

// Request logging middleware
app.use(requestLogger);

// Apply rate limiting
app.use('/api/auth/login', debugLog);
app.use('/api/', apiLimiter); // General API rate limiting
app.use('/api/auth/login', authLimiter); // Stricter auth rate limiting
app.use('/api/auth/register', authLimiter); // Stricter auth rate limiting
app.use('/api/auth/forgot-password', passwordResetLimiter); // Password reset rate limiting
app.use('/api/admin', adminLimiter); // Admin endpoints rate limiting

// Apply speed limiting for gradual slowdown
// app.use(speedLimiter);

/* CSRF protection middleware removed for API routes.
   CSRF is not required for RESTful APIs using JWT authentication.
   If needed, apply CSRF only to legacy browser form routes. */
// Temporarily disable mongoSanitize due to Node.js compatibility issues
// TODO: Fix mongo-sanitize compatibility with newer Node.js versions
/*
if (process.env.NODE_ENV !== 'test') {
  app.use(mongoSanitize({
    onSanitize: ({ req, key }) => {
      // Log sanitization attempts for debugging
      console.warn(`MongoDB injection attempt detected: ${key}`);
    },
    allowDots: true,
    replaceWith: '_'
  }));
*/

// Main health check endpoint with detailed status
app.get('/health', async (req, res) => {
  try {
    // Check Supabase connection
    let supabaseStatus = 'unknown';
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (!error) {
        supabaseStatus = 'connected';
      } else {
        supabaseStatus = 'disconnected';
      }
    } catch (error) {
      supabaseStatus = 'disconnected';
    }

    // Check Redis/cache connection
    let cacheStatus = 'in-memory';
    try {
      // Test cache by setting and getting a test value
      await cache.set('health-check', 'ok', 10);
      const testResult = await cache.get('health-check');
      if (testResult === 'ok') {
        cacheStatus = 'redis-connected';
      }
    } catch (error) {
      cacheStatus = 'redis-disconnected';
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        supabase: supabaseStatus,
        cache: cacheStatus
      },
      version: process.env.npm_package_version || '1.0.0'
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness probe
app.get('/ready', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (!error) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/overwatch-accounts', overwatchAccountRoutes);
app.use('/api/email-service', emailServiceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/google-auth', googleAuthRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use(errorHandler);

// Socket.IO authentication - FIXED to be more lenient for initial connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  
  // Log connection attempt
  console.log('[Socket.IO Auth] Connection attempt from:', socket.handshake.headers.origin);
  
  if (!token) {
    console.log('[Socket.IO Auth] No token provided, allowing anonymous connection');
    // Allow connection without auth for public features
    socket.user = null;
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();
      
    if (error || !user) {
      console.log('[Socket.IO Auth] User not found for token');
      socket.user = null;
      return next();
    }
    
    socket.user = user;
    console.log('[Socket.IO Auth] Authenticated user:', user.username);
    next();
  } catch (error) {
    console.log('[Socket.IO Auth] Token verification failed:', error.message);
    socket.user = null;
    next(); // Allow connection even with invalid token
  }
});

// Track online users
const onlineUsers = new Map();

// Make io and onlineUsers accessible in routes
app.set('io', io);
app.set('onlineUsers', onlineUsers);

io.on('connection', (socket) => {
  console.log('[Socket.IO] Client connected:', {
    id: socket.id,
    user: socket.user?.username || 'anonymous',
    origin: socket.handshake.headers.origin
  });

  if (socket.user) {
    // Authenticated user
    logger.info('Authenticated user connected via socket', {
      userId: socket.user.id,
      username: socket.user.username,
      socketId: socket.id
    });

    // Add user to online users map
    onlineUsers.set(socket.user.id, {
      id: socket.user.id,
      username: socket.user.username,
      socketId: socket.id,
      connectedAt: new Date()
    });

    // Join a room specific to the user
    socket.join(socket.user.id);
    
    // Send initial data to the newly connected user
    socket.emit('connectionSuccess', {
      userId: socket.user.id,
      onlineUsers: onlineUsers.size
    });
  } else {
    // Anonymous connection - still emit basic events
    console.log('[Socket.IO] Anonymous connection established');
    socket.emit('connectionSuccess', {
      userId: null,
      onlineUsers: onlineUsers.size
    });
  }

  // Emit updated online users count to all connected clients
  const onlineCount = onlineUsers.size;
  io.emit('onlineUsers', onlineCount);
  
  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', {
      id: socket.id,
      user: socket.user?.username || 'anonymous'
    });
    
    if (socket.user) {
      logger.info('User disconnected from socket', {
        userId: socket.user.id,
        username: socket.user.username
      });
      
      // Remove user from online users map
      onlineUsers.delete(socket.user.id);
    }
    
    // Emit updated online users count to all remaining clients
    const onlineCount = onlineUsers.size;
    io.emit('onlineUsers', onlineCount);
  });

  // Handle request for current online users count
  socket.on('requestOnlineUsers', () => {
    socket.emit('onlineUsers', onlineUsers.size);
  });
  
  // Handle OTP-related events (no auth required for listening)
  socket.on('subscribeToOTP', () => {
    console.log('[Socket.IO] Client subscribed to OTP updates');
    socket.join('otp-updates');
  });
});

const PORT = process.env.PORT || 5001;

// Centralized server startup function
async function startServer() {
  try {
    // Start memory monitoring
    if (process.env.NODE_ENV !== 'test') {
      memoryMonitor();
      // Start the OTP fetching service only once
      startOtpFetching(io);
    }

    
    
    if (require.main === module) {
      server.listen(PORT, '0.0.0.0', () => {
        logger.info(`Server is now listening on port ${PORT}`);
        console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
        console.log(`[Server] CORS enabled for: ${uniqueOrigins.join(', ')}`);
      });
    
      server.on('error', (err) => {
        logger.error('Server failed to start', {
          error: err.message,
          code: err.code,
          stack: err.stack,
        });
        process.exit(1);
      });
    }
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: err.message,
    stack: err.stack,
  });
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Start the server
startServer();

// Log all registered endpoints for debugging
console.log('--- Registered Server Endpoints ---');
console.table(listEndpoints(app));

// For testing, export the server
module.exports = server;