const logger = require('../utils/logger');

// Debug logging middleware
const debugLog = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
      logger.debug('Request Body:', JSON.stringify(req.body, null, 2));
    }
  }
  next();
};

module.exports = debugLog;