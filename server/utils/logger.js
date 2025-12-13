const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define which transports the logger must use
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),

  // Error log file
  new DailyRotateFile({
    filename: "logs/error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "error",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "14d",
  }),

  // Combined log file
  new DailyRotateFile({
    filename: "logs/combined-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "14d",
  }),

  // HTTP requests log file
  new DailyRotateFile({
    filename: "logs/http-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "http",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "14d",
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format,
  transports,
});

// Create logs directory if it doesn't exist
const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom middleware for HTTP request logging
const httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${req.ip}`
    );
  });

  next();
};

// Performance monitoring logger
const performanceLogger = {
  logQuery: (operation, collection, duration, query = {}) => {
    logger.info(`DB Query: ${operation} on ${collection} - ${duration}ms`, {
      operation,
      collection,
      duration,
      query: JSON.stringify(query).substring(0, 200), // Limit query size
    });
  },

  logCache: (operation, key, hit = null, duration = null) => {
    const message = `Cache ${operation}: ${key}`;
    const meta = {};
    if (hit !== null) meta.hit = hit;
    if (duration !== null) meta.duration = duration;

    logger.info(message, meta);
  },

  logApiCall: (method, url, statusCode, duration, userId = null) => {
    logger.info(`API Call: ${method} ${url} ${statusCode} - ${duration}ms`, {
      method,
      url,
      statusCode,
      duration,
      userId,
    });
  },
};

// Security event logger
const securityLogger = {
  logAuthAttempt: (email, success, ip, userAgent) => {
    const level = success ? "info" : "warn";
    const message = `Auth attempt: ${email} - ${
      success ? "SUCCESS" : "FAILED"
    }`;
    logger.log(level, message, {
      email,
      success,
      ip,
      userAgent,
      event: "authentication",
    });
  },

  logRateLimit: (ip, endpoint, limit) => {
    logger.warn(`Rate limit exceeded: ${ip} on ${endpoint}`, {
      ip,
      endpoint,
      limit,
      event: "rate_limit",
    });
  },

  logSuspiciousActivity: (ip, activity, details = {}) => {
    logger.warn(`Suspicious activity: ${activity} from ${ip}`, {
      ip,
      activity,
      ...details,
      event: "suspicious_activity",
    });
  },
};

// Admin audit logger for tracking admin operations
const adminAuditLogger = {
  /**
   * Log user creation by admin
   */
  logUserCreated: (
    adminId,
    adminUsername,
    newUserId,
    newUsername,
    newUserEmail
  ) => {
    logger.info(`ADMIN AUDIT: User created`, {
      event: "admin_user_created",
      adminId,
      adminUsername,
      targetUserId: newUserId,
      targetUsername: newUsername,
      targetEmail: newUserEmail,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log user deletion by admin
   */
  logUserDeleted: (adminId, adminUsername, deletedUserId, deletedUsername) => {
    logger.warn(`ADMIN AUDIT: User deleted`, {
      event: "admin_user_deleted",
      adminId,
      adminUsername,
      targetUserId: deletedUserId,
      targetUsername: deletedUsername,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log user status change by admin
   */
  logUserStatusChanged: (
    adminId,
    adminUsername,
    targetUserId,
    targetUsername,
    oldStatus,
    newStatus
  ) => {
    logger.info(`ADMIN AUDIT: User status changed`, {
      event: "admin_user_status_changed",
      adminId,
      adminUsername,
      targetUserId,
      targetUsername,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log user role change by admin
   */
  logUserRoleChanged: (
    adminId,
    adminUsername,
    targetUserId,
    targetUsername,
    oldRole,
    newRole
  ) => {
    logger.warn(`ADMIN AUDIT: User role changed`, {
      event: "admin_user_role_changed",
      adminId,
      adminUsername,
      targetUserId,
      targetUsername,
      oldRole,
      newRole,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log registration toggle by admin
   */
  logRegistrationToggled: (adminId, adminUsername, enabled) => {
    logger.info(
      `ADMIN AUDIT: Registration ${enabled ? "enabled" : "disabled"}`,
      {
        event: "admin_registration_toggled",
        adminId,
        adminUsername,
        registrationEnabled: enabled,
        timestamp: new Date().toISOString(),
      }
    );
  },

  /**
   * Log settings change by admin
   */
  logSettingsChanged: (
    adminId,
    adminUsername,
    settingKey,
    oldValue,
    newValue
  ) => {
    logger.info(`ADMIN AUDIT: Setting changed`, {
      event: "admin_settings_changed",
      adminId,
      adminUsername,
      settingKey,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log data export request (GDPR)
   */
  logDataExport: (
    requesterId,
    requesterUsername,
    targetUserId,
    targetUsername
  ) => {
    logger.info(`ADMIN AUDIT: Data export requested`, {
      event: "data_export_requested",
      requesterId,
      requesterUsername,
      targetUserId,
      targetUsername,
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = {
  logger,
  httpLogger,
  performanceLogger,
  securityLogger,
  adminAuditLogger,
};
