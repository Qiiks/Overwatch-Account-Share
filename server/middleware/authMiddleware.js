const jwt = require("jsonwebtoken");
const { supabase } = require("../config/db");
const { securityLogger } = require("../utils/logger");
const Settings = require("../models/Settings");
const { cache } = require("../utils/cache");
const ApiError = require("../utils/ApiError");
const { AUTH_COOKIE } = require("../utils/cookies");

// Cookie first (browser clients), Bearer fallback for scripts and non-browser clients.
const extractToken = (req) => {
  if (req.cookies && req.cookies[AUTH_COOKIE]) {
    return req.cookies[AUTH_COOKIE];
  }
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }
  return null;
};

const authMiddleware = async (req, res, next) => {
  const token = extractToken(req);
  const email = (req.body && req.body.email) || null;
  const userAgent = req.headers["user-agent"];

  if (!token) {
    securityLogger.logAuthAttempt(email, false, req.ip, userAgent);
    return next(new ApiError(401, "UNAUTHENTICATED", "No token, authorization denied"));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    securityLogger.logAuthAttempt(email, false, req.ip, userAgent);
    const message =
      error.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return next(new ApiError(401, "UNAUTHENTICATED", message));
  }

  // Past this point a failure is a database/config problem, not a bad token: it must
  // surface as a logged 500, never as "401 on every protected route".
  try {
    const minJwtIat = await cache.getOrSet(
      "min_jwt_issued_at",
      async () => {
        const val = await Settings.getSetting("min_jwt_issued_at");
        return val ? Number(val) : 0;
      },
      60,
    );

    if (minJwtIat && decoded.iat * 1000 < minJwtIat) {
      securityLogger.logAuthAttempt(email, false, req.ip, userAgent);
      return next(
        new ApiError(
          401,
          "UNAUTHENTICATED",
          "Session expired due to security policy. Please login again.",
        ),
      );
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email, role, isadmin, isapproved")
      .eq("id", decoded.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!user) {
      securityLogger.logAuthAttempt(email, false, req.ip, userAgent);
      return next(new ApiError(401, "UNAUTHENTICATED", "User not found, authorization denied"));
    }

    // Approval is re-checked on every request: a suspension must not wait for token expiry.
    if (user.isapproved === false) {
      securityLogger.logAuthAttempt(email, false, req.ip, userAgent);
      return next(new ApiError(403, "FORBIDDEN", "Your account is suspended"));
    }

    user.role = user.isadmin ? "admin" : "user";
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, "FORBIDDEN", "You are not authorized to access this route"));
  }
  return next();
};

module.exports = {
  protect: authMiddleware,
  authorize,
  extractToken,
};
