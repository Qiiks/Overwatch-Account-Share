const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error using winston
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  // Default error
  let error = {
    message: err.message || 'Server Error',
    statusCode: err.statusCode || 500
  };

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Prepare response based on environment
  const response = {
    success: false,
    message: error.message || 'Server Error'
  };

  // In production, sanitize error responses to avoid leaking internal details
  if (process.env.NODE_ENV === 'production') {
    response.stack = '🥞';
  } else {
    // In development, include full stack trace for debugging
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;