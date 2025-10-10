const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

const optionalAuth = async (req, res, next) => {
  // If no Authorization header, continue without user
  if (!req.headers.authorization) {
    req.user = null;
    return next();
  }

  // Check if Authorization header starts with "Bearer "
  if (!req.headers.authorization.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  // Extract the token after "Bearer "
  const token = req.headers.authorization.split(' ')[1];

  // If no token, continue without user
  if (!token || token === '') {
    req.user = null;
    return next();
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
      console.log('User not found in database for optional auth');
      req.user = null;
      return next();
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.log('JWT verification failed in optional auth:', error.message);
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;