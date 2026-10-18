const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Fail fast with a single message naming every missing variable. This must run before
// the requires below: config/db.js, utils/encryption.js and googleAuthController.js all
// throw at module load when their variables are absent.
const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'ENCRYPTION_SECRET',
  'OAUTH_STATE_SECRET',
];
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
if (!process.env.ALLOWED_ORIGINS && !process.env.FRONTEND_URL) {
  missingEnv.push('ALLOWED_ORIGINS (or FRONTEND_URL)');
}
if (missingEnv.length > 0) {
  console.error(`[config] Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const listEndpoints = require('express-list-endpoints');
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
const errorHandler = require('./middleware/errorMiddleware');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter, authLimiter, passwordResetLimiter, adminLimiter } = require('./middleware/rateLimiter');
const { httpLogger, logger, performanceLogger, securityLogger } = require('./utils/logger');
const { performanceMonitor, memoryMonitor } = require('./middleware/performanceMonitor');
const { cache } = require('./utils/cache');
const { AUTH_COOKIE } = require('./utils/cookies');

const app = express();

app.set('trust proxy', 1);

// TLS terminates at the reverse proxy (Traefik on Coolify); the container speaks plain HTTP.
const server = http.createServer(app);

// Define allowed origins from environment variable only
let allowedOrigins = [];

if (process.env.ALLOWED_ORIGINS) {
  const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  allowedOrigins = [...new Set(envOrigins.filter(Boolean))];
} else {
  allowedOrigins = [process.env.FRONTEND_URL];
}

const uniqueOrigins = [...new Set(allowedOrigins)];

logger.info('[CORS] Configured allowed origins:', { origins: uniqueOrigins });

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (uniqueOrigins.includes(origin)) {
      return callback(null, origin);
    }

    securityLogger.logSuspiciousActivity(origin, 'CORS violation', {
      attemptedOrigin: origin,
      allowedOrigins: uniqueOrigins,
    });
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-csrf-token'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  optionsSuccessStatus: 200,
};

// app.use(cors()) already answers preflight; Express 5 would reject app.options('*').
app.use(cors(corsOptions));

const io = new Server(server, {
  cors: {
    origin: uniqueOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Lets io.use read the same httpOnly auth cookie the HTTP API uses.
io.engine.use(cookieParser());

logger.info('[Socket.IO] Configured with CORS origins', { origins: uniqueOrigins });

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
        ...(process.env.NODE_ENV === 'production'
          ? uniqueOrigins.map((origin) => origin.replace('http://', 'wss://').replace('https://', 'wss://'))
          : uniqueOrigins.map((origin) => origin.replace('http://', 'ws://').replace('https://', 'wss://'))),
      ],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    // An unconditional includeSubDomains pins every sibling subdomain of the host
    // domain to HTTPS for a year; opt in only when that is actually intended.
    includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS === 'true',
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginEmbedderPolicy: false,
}));
app.disable('x-powered-by');

app.use(cookieParser());

app.use(csrfProtection);
logger.info('CSRF protection enabled using double-submit cookie pattern');

app.use(compression());

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use(httpLogger);
app.use(performanceMonitor);
app.use(requestLogger);

// Apply rate limiting
app.use('/api/', apiLimiter); // General API rate limiting
app.use('/api/auth/login', authLimiter); // Stricter auth rate limiting
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', passwordResetLimiter);
app.use('/api/admin', adminLimiter);

// Main health check endpoint with detailed status
app.get('/health', async (req, res) => {
  try {
    let supabaseStatus = 'unknown';
    try {
      const { error } = await supabase.from('users').select('count').limit(1);
      supabaseStatus = error ? 'disconnected' : 'connected';
    } catch (error) {
      supabaseStatus = 'disconnected';
    }

    let cacheStatus = 'in-memory';
    try {
      await cache.set('health-check', 'ok', 10);
      const testResult = await cache.get('health-check');
      if (testResult === 'ok') {
        cacheStatus = 'redis-connected';
      }
    } catch (error) {
      cacheStatus = 'redis-disconnected';
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        supabase: supabaseStatus,
        cache: cacheStatus,
      },
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Readiness probe
app.get('/ready', async (req, res) => {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (!error) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

// API health check endpoint (sets CSRF token)
app.get('/api/health', csrfProtection, (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/overwatch-accounts', overwatchAccountRoutes);
app.use('/api/email-service', emailServiceRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/google-auth', googleAuthRoutes);
app.use('/api/settings', settingsRoutes);

// Development-only harness routes (never mounted in production).
if (process.env.NODE_ENV !== 'production' && process.env.DEV_TOOLS === 'true') {
  app.use('/api/dev', require('./routes/dev'));
  logger.info('Dev tooling mounted at /api/dev');
}

app.use(errorHandler);

/**
 * Socket.IO authentication.
 * Cookie first (the browser client), Bearer fallback for non-browser clients.
 * Anonymous sockets may connect but receive nothing that requires a user.
 */
io.use(async (socket, next) => {
  const cookieToken = socket.request.cookies && socket.request.cookies[AUTH_COOKIE];
  const headerToken = socket.handshake.auth && socket.handshake.auth.token;
  const token = cookieToken || headerToken;
  const origin = socket.handshake.headers.origin;

  socket.user = null;
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, isadmin, isapproved')
      .eq('id', decoded.id)
      .single();

    if (!error && user) {
      socket.user = user;
    }
  } catch (error) {
    logger.debug('[Socket.IO Auth] Token verification failed', { error: error.message, origin });
  }
  return next();
});

// Track online users
const onlineUsers = new Map();

app.set('io', io);
app.set('onlineUsers', onlineUsers);

io.on('connection', (socket) => {
  logger.debug('[Socket.IO] Client connected', {
    socketId: socket.id,
    user: socket.user?.username || 'anonymous',
    origin: socket.handshake.headers.origin,
  });

  if (socket.user) {
    logger.info('Authenticated user connected via socket', {
      userId: socket.user.id,
      username: socket.user.username,
      socketId: socket.id,
    });

    onlineUsers.set(socket.user.id, {
      id: socket.user.id,
      username: socket.user.username,
      socketId: socket.id,
      connectedAt: new Date(),
    });

    // Per-user room: OTP pushes are addressed to the owner and the shared users only.
    socket.join(socket.user.id);

    socket.emit('connectionSuccess', {
      userId: socket.user.id,
      onlineUsers: onlineUsers.size,
    });
  } else {
    socket.emit('connectionSuccess', {
      userId: null,
      onlineUsers: onlineUsers.size,
    });
  }

  io.emit('onlineUsers', onlineUsers.size);

  socket.on('disconnect', () => {
    logger.debug('[Socket.IO] Client disconnected', {
      socketId: socket.id,
      user: socket.user?.username || 'anonymous',
    });

    if (socket.user) {
      onlineUsers.delete(socket.user.id);
    }

    io.emit('onlineUsers', onlineUsers.size);
  });

  socket.on('requestOnlineUsers', () => {
    socket.emit('onlineUsers', onlineUsers.size);
  });
});

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      memoryMonitor();
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

// Rejections are logged; only an uncaught exception (an unknown broken state) stops the process.
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', {
    reason: err && err.message,
    stack: err && err.stack,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', {
    reason: err && err.message,
    stack: err && err.stack,
  });
  process.exit(1);
});

startServer();

if (process.env.NODE_ENV !== 'production') {
  console.log('--- Registered Server Endpoints ---');
  console.table(listEndpoints(app));
}

module.exports = server;
module.exports.app = app;
