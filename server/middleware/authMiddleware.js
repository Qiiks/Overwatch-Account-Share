const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');
const { securityLogger } = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  // Check if Authorization header exists
  if (!req.headers.authorization) {
    securityLogger.logAuthAttempt(req.ip, null, false, 'No Authorization header');
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }

  // Check if Authorization header starts with "Bearer " (with space)
  if (!req.headers.authorization.startsWith('Bearer ')) {
    securityLogger.logAuthAttempt(req.ip, null, false, 'Invalid token format');
    return res.status(401).json({
      success: false,
      message: 'Invalid token format, authorization denied'
    });
  }

  // Extract the token after "Bearer "
  const token = req.headers.authorization.split(' ')[1];

  // Check if token exists and is not empty after "Bearer "
  if (!token || token === '') {
    securityLogger.logAuthAttempt(req.ip, null, false, 'No token provided');
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      securityLogger.logAuthAttempt(req.ip, decoded.id, false, 'User not found');
      return res.status(401).json({
        success: false,
        message: 'User not found, authorization denied'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    securityLogger.logAuthAttempt(req.ip, null, false, `JWT verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid token, authorization denied'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const error = new Error(`User role ${req.user.role} is not authorized to access this route`);
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};

module.exports = {
  protect: authMiddleware,
  authorize
};