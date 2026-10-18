const rateLimit = require('express-rate-limit');

// Every limiter answers with the shared error envelope so the client needs one parser.
const limited = (message) => ({
  success: false,
  error: { message, code: 'RATE_LIMITED' },
});

// Budget sized for an SPA session (the dashboard polls and pages fan out to several
// requests each); the tight limits live on the sensitive routes below.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: limited('Too many requests from this IP, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});

// Stricter limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: limited('Too many authentication attempts, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
});

// Password change: 3 attempts per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: limited('Too many password change attempts, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin surface: generous enough for list/status/role/search work in one sitting.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: limited('Too many admin requests, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  adminLimiter,
};
