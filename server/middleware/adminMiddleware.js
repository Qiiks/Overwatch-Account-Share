const adminMiddleware = (req, res, next) => {
  // Check if user is authenticated and has admin privileges
  if (!req.user || !req.user.isadmin) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this route. Admin privileges required.'
    });
  }
  next();
};

module.exports = adminMiddleware;