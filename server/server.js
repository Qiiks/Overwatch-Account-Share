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
const cookieParser = require('cookie-parser');
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
const csrfProtection = require('./middleware/csrfProtection');
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
  logger.info('HTTPS server enabled');
} catch (err) {
  server = http.createServer(app);
  logger.warn('HTTPS certs not found, falling back to HTTP');
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

logger.info('[CORS] Configured allowed origins:', { origins: uniqueOrigins });

// CRITICAL FIX: Simplified CORS middleware with explicit origin handling
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (server-to-server, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in our allowed list
    if (uniqueOrigins.includes(origin)) {
      logger.debug(`[CORS] Origin allowed: ${origin}`);
      return callback(null, origin); // Return the specific origin, not just true
    }
    
    securityLogger.logSuspiciousActivity(origin, 'CORS violation', {
      attemptedOrigin: origin,
      allowedOrigins: uniqueOrigins
    });
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

logger.info('[Socket.IO] Configured with CORS origins', { origins: uniqueOrigins });

// Security middleware - Enhanced configuration with comprehensive security headers
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
        // In production, enforce secure WebSocket connections (wss://)
        // In development, allow both ws:// and wss://
        ...(process.env.NODE_ENV === 'production'
          ? uniqueOrigins.map(origin => origin.replace('http://', 'wss://').replace('https://', 'wss://'))
          : uniqueOrigins.map(origin => origin.replace('http://', 'ws://').replace('https://', 'wss://'))
        )
      ],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"], // Prevents clickjacking attacks
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // Enforce HTTPS and prevent downgrade attacks
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
  },
  // Prevent MIME type sniffing
  noSniff: true,
  // Prevent framing (clickjacking protection)
  frameguard: { action: 'deny' },
  // Enable XSS filter
  xssFilter: true,
  // Control referrer information
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginEmbedderPolicy: false
}));
app.disable('x-powered-by');

// Cookie parser middleware (required for CSRF protection)
app.use(cookieParser());

// CSRF Protection using double-submit cookie pattern
// Applied globally to protect against Cross-Site Request Forgery attacks
app.use(csrfProtection);
logger.info('CSRF protection enabled using double-submit cookie pattern');

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
  const origin = socket.handshake.headers.origin;
  
  logger.debug('[Socket.IO Auth] Connection attempt', { origin });
  
  if (!token) {
    logger.debug('[Socket.IO Auth] Anonymous connection allowed');
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
      logger.debug('[Socket.IO Auth] User not found for provided token');
      socket.user = null;
      return next();
    }
    
    socket.user = user;
    logger.debug('[Socket.IO Auth] User authenticated', { username: user.username });
    next();
  } catch (error) {
    logger.debug('[Socket.IO Auth] Token verification failed', { error: error.message });
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
  logger.debug('[Socket.IO] Client connected', {
    socketId: socket.id,
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
    logger.debug('[Socket.IO] Anonymous connection established');
    socket.emit('connectionSuccess', {
      userId: null,
      onlineUsers: onlineUsers.size
    });
  }

  // Emit updated online users count to all connected clients
  const onlineCount = onlineUsers.size;
  io.emit('onlineUsers', onlineCount);
  
  socket.on('disconnect', () => {
    logger.debug('[Socket.IO] Client disconnected', {
      socketId: socket.id,
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
    logger.debug('[Socket.IO] Client subscribed to OTP updates');
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
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
          console.log(`[Server] CORS enabled for: ${uniqueOrigins.join(', ')}`);
        }
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

// Log all registered endpoints for debugging (development only)
if (process.env.NODE_ENV !== 'production') {
  console.log('--- Registered Server Endpoints ---');
  console.table(listEndpoints(app));
}

// For testing, export the server
module.exports = server;