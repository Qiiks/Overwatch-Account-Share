const ApiError = require('../utils/ApiError');

const adminMiddleware = (req, res, next) => {
  // Check if user is authenticated and has admin privileges
  if (!req.user || !req.user.isadmin) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Not authorized to access this route. Admin privileges required.'
    );
  }
  next();
};

module.exports = adminMiddleware;