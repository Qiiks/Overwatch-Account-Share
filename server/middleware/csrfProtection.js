const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { securityLogger } = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { CSRF_COOKIE, csrfCookieOptions } = require('../utils/cookies');

/**
 * CSRF protection: double-submit cookie + Origin allowlist.
 *
 * The cookie is httpOnly; the client receives the token in the body of
 * GET /api/auth/csrf and echoes it in the x-csrf-token header. It never reads a
 * cookie with JavaScript — that would not work cross-origin anyway, and keeps the
 * token out of reach of XSS.
 */

const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32; // 32 bytes = 256 bits
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const generateToken = () => crypto.randomBytes(TOKEN_LENGTH).toString('hex');

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// Browsers always send Origin on state-changing requests; non-browser clients
// (curl, the test suite) send neither and are not subject to CSRF anyway.
const originIsAllowed = (req) => {
  const origin = req.get('origin') || req.get('referer');
  if (!origin) return true;
  return allowedOrigins().some(
    (allowed) => origin === allowed || origin.startsWith(`${allowed}/`),
  );
};

function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  const existing = req.cookies && req.cookies[CSRF_COOKIE];

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    // Issue once. Rotating on every GET invalidates the copy the client holds in
    // memory and turns concurrent page loads into guaranteed 403s.
    const token = existing || generateToken();
    if (!existing) {
      res.cookie(CSRF_COOKIE, token, csrfCookieOptions(TOKEN_MAX_AGE_MS));
    }
    req.csrfToken = token;
    return next();
  }

  if (!originIsAllowed(req)) {
    securityLogger.logSuspiciousActivity(req.ip, 'CSRF origin rejected', {
      origin: req.get('origin'),
      referer: req.get('referer'),
      path: req.path,
    });
    return next(new ApiError(403, 'CSRF_ORIGIN_REJECTED', 'Request origin is not allowed'));
  }

  const cookieToken = existing;
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken) {
    logger.warn('CSRF validation failed: missing cookie token', { path: req.path, ip: req.ip });
    return next(
      new ApiError(403, 'CSRF_COOKIE_MISSING', 'CSRF token missing from cookies. Refresh and try again.'),
    );
  }

  if (!headerToken) {
    logger.warn('CSRF validation failed: missing header token', { path: req.path, ip: req.ip });
    return next(
      new ApiError(403, 'CSRF_HEADER_MISSING', 'CSRF token missing from the request header.'),
    );
  }

  const cookieBuffer = Buffer.from(cookieToken, 'utf8');
  const headerBuffer = Buffer.from(headerToken, 'utf8');

  if (cookieBuffer.length !== headerBuffer.length) {
    logger.warn('CSRF validation failed: token length mismatch', { path: req.path, ip: req.ip });
    return next(new ApiError(403, 'CSRF_TOKEN_INVALID', 'Invalid CSRF token. Refresh and try again.'));
  }

  if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    logger.warn('CSRF validation failed: token mismatch', { path: req.path, ip: req.ip });
    return next(new ApiError(403, 'CSRF_TOKEN_MISMATCH', 'CSRF token validation failed. Refresh and try again.'));
  }

  return next();
}

module.exports = csrfProtection;
module.exports.CSRF_HEADER_NAME = CSRF_HEADER_NAME;
