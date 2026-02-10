const jwt = require("jsonwebtoken");
const { supabase } = require("../config/db");
const { securityLogger } = require("../utils/logger");
const Settings = require("../models/Settings");
const { cache } = require("../utils/cache");

const authMiddleware = async (req, res, next) => {
  let token = null;

  // Priority 1: Check httpOnly cookie (most secure)
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }
  // Priority 2: Check Authorization header (backward compatibility)
  else if (req.headers.authorization) {
    // Check if Authorization header starts with "Bearer " (with space)
    if (!req.headers.authorization.startsWith("Bearer ")) {
      securityLogger.logAuthAttempt(
        req.ip,
        null,
        false,
        "Invalid token format",
      );
      return res.status(401).json({
        success: false,
        message: "Invalid token format, authorization denied",
      });
    }
    // Extract the token after "Bearer "
    token = req.headers.authorization.split(" ")[1];
  }

  // No token found in either location
  if (!token || token === "") {
    securityLogger.logAuthAttempt(req.ip, null, false, "No token provided");
    return res.status(401).json({
      success: false,
      message: "No token, authorization denied",
    });
  }

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check for global logout (Force Logout)
    const minJwtIat = await cache.getOrSet(
      "min_jwt_issued_at",
      async () => {
        const val = await Settings.getSetting("min_jwt_issued_at");
        return val ? Number(val) : 0;
      },
      60,
    ); // Cache for 60 seconds

    if (minJwtIat && decoded.iat * 1000 < minJwtIat) {
      securityLogger.logAuthAttempt(
        req.ip,
        decoded.id,
        false,
        "Token invalidated by global logout",
      );
      return res.status(401).json({
        success: false,
        message: "Session expired due to security policy. Please login again.",
        code: "SESSION_INVALIDATED",
      });
    }

    // Fetch user from database
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      securityLogger.logAuthAttempt(
        req.ip,
        decoded.id,
        false,
        "User not found",
      );
      return res.status(401).json({
        success: false,
        message: "User not found, authorization denied",
      });
    }

    // Map Supabase fields to common middleware fields
    user.role = user.isadmin ? "admin" : "user";
    user.id = user.id;

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    securityLogger.logAuthAttempt(
      req.ip,
      null,
      false,
      `JWT verification failed: ${error.message}`,
    );
    return res.status(401).json({
      success: false,
      message: "Invalid token, authorization denied",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const error = new Error(
        `User role ${req.user.role} is not authorized to access this route`,
      );
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};

module.exports = {
  protect: authMiddleware,
  authorize,
};
