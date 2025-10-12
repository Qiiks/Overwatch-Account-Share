const { logger, performanceLogger } = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request details
  const method = req.method || 'UNKNOWN';
  const originalUrl = req.originalUrl || req.url || 'UNKNOWN';
  const ip = req.ip || req.connection.remoteAddress || 'UNKNOWN';
  const headers = req.headers || {};
  const userAgent = headers['user-agent'] || 'Unknown';
  
  logger.http(`${method} ${originalUrl} - ${ip} - ${userAgent}`);
  
  // Override res.end to log response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode || 'UNKNOWN';
    
    // Log response details
    logger.http(`Response: ${statusCode} - ${responseTime}ms`);
    
    // Log slow requests (over 500ms)
    if (responseTime > 500) {
      performanceLogger.logApiCall(`${method} ${originalUrl}`, responseTime, statusCode >= 400);
      logger.warn(`SLOW REQUEST: ${method} ${originalUrl} took ${responseTime}ms`);
    }
    
    // Call the original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

module.exports = requestLogger;