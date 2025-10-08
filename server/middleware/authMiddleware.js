const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  // Check if Authorization header exists
  if (!req.headers.authorization) {
    console.log('No Authorization header in request');
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }

  // Check if Authorization header starts with "Bearer " (with space)
  if (!req.headers.authorization.startsWith('Bearer ')) {
    console.log('Invalid Authorization header format');
    return res.status(401).json({
      success: false,
      message: 'Invalid token format, authorization denied'
    });
  }

  // Extract the token after "Bearer "
  const token = req.headers.authorization.split(' ')[1];

  // Check if token exists and is not empty after "Bearer "
  if (!token || token === '') {
    console.log('No token provided after Bearer');
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }

  try {
    // Verify the JWT token - use fallback if JWT_SECRET not set
    const jwtSecret = process.env.JWT_SECRET || 'production-secret-key-2025-overwatch-share-platform';
    const decoded = jwt.verify(token, jwtSecret);

    // Fetch user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      console.log('User not found in database');
      return res.status(401).json({
        success: false,
        message: 'User not found, authorization denied'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.log('JWT verification failed:', error.message);
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