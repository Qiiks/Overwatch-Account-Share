const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

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

// Stricter limiter for authentication endpoints. 10/15 min per IP: a household or VPN
// shares one budget, and a pending-approval 403 counts as a failure here.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: limited('Too many authentication attempts, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
});

// Failure counter per (origin, account): still blunts credential stuffing from one source
// without letting anyone who knows an address lock that member out from elsewhere.
const authEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: limited('Too many failed attempts for this account, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    // ipKeyGenerator normalises IPv6 to a /56 block; a raw req.ip there is bypassable.
    return `${ipKeyGenerator(req.ip)}|${email || 'anonymous'}`;
  },
});

// Password change: the route already requires a valid session, so this only needs to stop
// brute-forcing the current password. 3/h locked people out of their own account.
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: limited('Too many password change attempts, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  authEmailLimiter,
  passwordResetLimiter,
};
