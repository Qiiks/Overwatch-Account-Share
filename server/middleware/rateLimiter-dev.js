const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Development-friendly rate limiters with higher limits

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // INCREASED for development
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health';
  }
});

// Development-friendly auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // INCREASED from 5 to 100 for development
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false
});

// Speed limiter for gradual slowdown
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 500, // INCREASED for development
  delayMs: 100, // DECREASED for development
  maxDelayMs: 2000, // DECREASED for development
  skipFailedRequests: true,
  skipSuccessfulRequests: false,
  validate: false
});

// Password reset limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50, // INCREASED for development
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Admin endpoints limiter
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // INCREASED for development
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

console.log('⚠️  WARNING: Using development rate limits - DO NOT USE IN PRODUCTION!');
console.log('📌 Auth rate limit: 100 attempts per 15 minutes (instead of 5)');

module.exports = {
  apiLimiter,
  authLimiter,
  speedLimiter,
  passwordResetLimiter,
  adminLimiter
};