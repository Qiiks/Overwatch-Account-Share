const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { securityLogger } = require('../utils/logger');

/**
 * Input sanitization middleware
 * Sanitizes and validates all incoming request data
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = req.query[key].trim();
    }
  }

  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize route parameters
  for (const key in req.params) {
    if (typeof req.params[key] === 'string') {
      req.params[key] = req.params[key].trim();
    }
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potential XSS vectors
      obj[key] = obj[key]
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .substring(0, 1000); // Limit string length
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
};

/**
 * SQL injection protection middleware
 */
const sqlInjectionProtection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /('|(\\x27)|(\\x2D\\x2D)|(\\#)|(\\x23)|(\%27)|(\%23)|(\%3B)|(;))/i,
    /(<script|javascript:|vbscript:|onload=|onerror=)/i
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          securityLogger.logSuspiciousActivity(
            req.ip,
            'Potential SQL injection or XSS attempt',
            { value: value.substring(0, 100), userAgent: req.get('User-Agent') }
          );
          return res.status(400).json({
            success: false,
            error: 'Invalid input detected'
          });
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (checkValue(value[key])) return true;
      }
    }
    return false;
  };

  // Check all input sources
  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    return;
  }

  next();
};

/**
 * File upload security middleware
 */
const fileUploadSecurity = (req, res, next) => {
  if (!req.files && !req.file) return next();

  const files = req.files || [req.file];
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ];

  const maxSize = 5 * 1024 * 1024; // 5MB

  for (const file of files) {
    if (!allowedTypes.includes(file.mimetype)) {
      securityLogger.logSuspiciousActivity(
        req.ip,
        'Invalid file type upload attempt',
        { mimetype: file.mimetype, filename: file.originalname }
      );
      return res.status(400).json({
        success: false,
        error: 'Invalid file type'
      });
    }

    if (file.size > maxSize) {
      securityLogger.logSuspiciousActivity(
        req.ip,
        'File size limit exceeded',
        { size: file.size, filename: file.originalname }
      );
      return res.status(400).json({
        success: false,
        error: 'File too large'
      });
    }
  }

  next();
};

/**
 * Request size limiter
 */
const requestSizeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 large requests per windowMs
  message: {
    success: false,
    error: 'Request size limit exceeded'
  },
  skip: (req) => {
    // Only apply to large requests
    const contentLength = parseInt(req.headers['content-length'] || '0');
    return contentLength < 1024 * 1024; // Skip if less than 1MB
  }
});

module.exports = {
  sanitizeInput,
  sqlInjectionProtection,
  fileUploadSecurity,
  requestSizeLimiter
};