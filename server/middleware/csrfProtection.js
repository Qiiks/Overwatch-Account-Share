const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 * 
 * This is a modern, stateless approach to CSRF protection that:
 * 1. Generates a random token on GET requests
 * 2. Sets it as an httpOnly cookie
 * 3. Requires the same token to be sent in a custom header for state-changing requests
 * 4. Validates that both tokens match
 * 
 * This replaces the deprecated 'csurf' library.
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32; // 32 bytes = 256 bits of entropy

/**
 * Generate a cryptographically secure random token
 * @returns {string} Hex-encoded random token
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF Protection Middleware
 * 
 * For GET requests:
 * - Generates and sets a CSRF token cookie
 * - Allows the request to proceed
 * 
 * For all other requests (POST, PUT, DELETE, PATCH):
 * - Validates that the token in the cookie matches the token in the header
 * - Rejects requests with 403 if tokens don't match or are missing
 */
function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();

  // GET, HEAD, and OPTIONS requests don't need CSRF protection
  // They should be idempotent and not cause state changes
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    // Generate a new CSRF token for GET requests
    const token = generateToken();
    
    // Set the token as an httpOnly cookie
    res.cookie(CSRF_COOKIE_NAME, token, {
      // Double-submit pattern needs the client to read the cookie value for the header copy.
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Strict in production, lax in development
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });

    logger.debug('CSRF token generated for GET request', {
      method,
      path: req.path,
      hasExistingToken: !!req.cookies?.[CSRF_COOKIE_NAME]
    });

    return next();
  }

  // For state-changing requests, validate CSRF token
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  // Check if both tokens exist
  if (!cookieToken) {
    logger.warn('CSRF validation failed: Missing cookie token', {
      method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(403).json({
      error: 'CSRF token missing from cookies. Please refresh the page and try again.',
      code: 'CSRF_COOKIE_MISSING'
    });
  }

  if (!headerToken) {
    logger.warn('CSRF validation failed: Missing header token', {
      method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(403).json({
      error: 'CSRF token missing from request header. Please ensure your client is configured correctly.',
      code: 'CSRF_HEADER_MISSING'
    });
  }

  // Use timing-safe comparison to prevent timing attacks
  const cookieBuffer = Buffer.from(cookieToken, 'utf8');
  const headerBuffer = Buffer.from(headerToken, 'utf8');

  // Check that both buffers are the same length
  if (cookieBuffer.length !== headerBuffer.length) {
    logger.warn('CSRF validation failed: Token length mismatch', {
      method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(403).json({
      error: 'Invalid CSRF token. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  // Perform timing-safe comparison
  const tokensMatch = crypto.timingSafeEqual(cookieBuffer, headerBuffer);

  if (!tokensMatch) {
    logger.warn('CSRF validation failed: Token mismatch', {
      method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      cookieTokenLength: cookieToken.length,
      headerTokenLength: headerToken.length
    });

    return res.status(403).json({
      error: 'CSRF token validation failed. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_MISMATCH'
    });
  }

  // Tokens match - request is valid
  logger.debug('CSRF validation successful', {
    method,
    path: req.path
  });

  next();
}

module.exports = csrfProtection;