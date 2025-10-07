const { performanceLogger } = require('../utils/logger');

/**
 * Performance monitoring middleware
 * Tracks API response times and logs performance metrics
 */
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime.bigint();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    // Log performance metrics
    performanceLogger.logApiCall(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration.toFixed(2),
      req.user?.id
    );

    // Add performance header
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Database query performance monitor
 * Wraps mongoose queries to track performance
 */
const queryPerformanceMonitor = (schema) => {
  // Monitor find operations
  const originalFind = schema.statics.find;
  schema.statics.find = function(...args) {
    const start = process.hrtime.bigint();
    const query = originalFind.apply(this, args);

    const originalExec = query.exec;
    query.exec = async function(...execArgs) {
      try {
        const result = await originalExec.apply(this, execArgs);
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000;

        performanceLogger.logQuery(
          'find',
          schema.modelName,
          duration.toFixed(2),
          this.getQuery()
        );

        return result;
      } catch (error) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000;

        performanceLogger.logQuery(
          'find',
          schema.modelName,
          duration.toFixed(2),
          this.getQuery()
        );

        throw error;
      }
    };

    return query;
  };

  // Monitor save operations
  schema.pre('save', function(next) {
    this._startTime = process.hrtime.bigint();
    next();
  });

  schema.post('save', function() {
    if (this._startTime) {
      const end = process.hrtime.bigint();
      const duration = Number(end - this._startTime) / 1000000;

      performanceLogger.logQuery(
        'save',
        this.constructor.modelName,
        duration.toFixed(2)
      );
    }
  });
};

/**
 * Memory usage monitor
 * Logs memory usage at regular intervals
 */
const memoryMonitor = () => {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const usage = {
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
    };

    performanceLogger.logQuery('memory_usage', 'system', 0, usage);
  }, 300000); // Log every 5 minutes
};

module.exports = {
  performanceMonitor,
  queryPerformanceMonitor,
  memoryMonitor
};