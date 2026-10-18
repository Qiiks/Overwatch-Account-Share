const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { body, validationResult, matchedData } = require("express-validator");
const User = require("../models/User");
const Settings = require("../models/Settings");
const { validatePassword } = require("../utils/passwordValidator");
const { logger } = require("../utils/logger");
const ApiError = require("../utils/ApiError");
const { ok } = require("../utils/respond");
const {
  AUTH_COOKIE,
  authCookieOptions,
  clearCookieOptions,
} = require("../utils/cookies");
const { supabase } = require("../config/db");

// A fixed hash compared against when the email is unknown, so the response time
// of "no such user" matches "wrong password" and does not leak registration status.
const DUMMY_HASH =
  "$2b$10$6Z8s3WY.rMqrJwwlubVY3.Ll8aPoo66/IDwxoQTdMcmH1Z00Lt572";

const USERNAME_RULE = /^[A-Za-z0-9_.-]+$/;

const failValidation = (req) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  const details = {};
  for (const error of errors.array()) details[error.path] = error.msg;
  return new ApiError(400, "VALIDATION_FAILED", "Validation failed", details);
};

const issueSession = (res, user, rememberMe) => {
  const expiryMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const token = jwt.sign(
    { id: user.id || user._id },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? "7d" : "1h" },
  );
  res.cookie(AUTH_COOKIE, token, authCookieOptions(expiryMs));
};

// Legacy bcrypt-hashed Overwatch passwords can't be shown to the owner until re-saved.
const countLegacyPasswords = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("overwatch_accounts")
      .select("id, password_encryption_type")
      .eq("owner_id", userId);

    if (error || !data) return { hasLegacyPasswords: false, legacyPasswordCount: 0 };

    const legacy = data.filter(
      (account) => account.password_encryption_type === "bcrypt",
    );
    if (legacy.length > 0) {
      logger.info("[SECURITY] User has legacy bcrypt passwords", {
        userId,
        legacyCount: legacy.length,
      });
    }
    return { hasLegacyPasswords: legacy.length > 0, legacyPasswordCount: legacy.length };
  } catch (error) {
    logger.warn("[SECURITY] Failed to check for legacy passwords", {
      error: error.message,
      userId,
    });
    return { hasLegacyPasswords: false, legacyPasswordCount: 0 };
  }
};

exports.register = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 32 })
    .withMessage("Username must be 3-32 characters")
    .matches(USERNAME_RULE)
    .withMessage("Username may only contain letters, numbers, dot, dash and underscore"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail({ gmail_remove_dots: false, all_lowercase: true }),

  body("password")
    .isString()
    .withMessage("Password is required")
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }
      return true;
    }),

  async (req, res, next) => {
    try {
      const invalid = failValidation(req);
      if (invalid) throw invalid;

      const allowRegistration = await Settings.getSetting("allow_registration");
      if (allowRegistration === false) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "User registration is currently disabled by the administrator.",
        );
      }

      const { username, email, password } = matchedData(req);

      if (await User.findOne({ email })) {
        throw new ApiError(409, "CONFLICT", "An account with this email already exists");
      }
      if (await User.findOne({ username })) {
        throw new ApiError(409, "CONFLICT", "That username is already taken");
      }

      const saved = await new User({ username, email, password }).save();
      const publicUser = User.toPublic(saved);

      if (!publicUser.isApproved) {
        return ok(res, { pendingApproval: true }, 201);
      }

      issueSession(res, { id: saved.id }, false);
      return ok(res, { user: publicUser }, 201);
    } catch (error) {
      next(error);
    }
  },
];

exports.login = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail({ gmail_remove_dots: false, all_lowercase: true }),

  body("password").isString().notEmpty().withMessage("Password is required"),

  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me flag must be a boolean")
    .toBoolean(),

  async (req, res, next) => {
    try {
      const invalid = failValidation(req);
      if (invalid) throw invalid;

      const { email, password, rememberMe = false } = matchedData(req);

      const user = await User.findOne({ email });
      if (!user) {
        // Equalise timing with the wrong-password path before answering identically.
        await bcrypt.compare(password, DUMMY_HASH);
        throw new ApiError(401, "UNAUTHENTICATED", "Invalid email or password");
      }

      const isMatch = await bcrypt.compare(
        password,
        user.password_hash || user.password,
      );
      if (!isMatch) {
        throw new ApiError(401, "UNAUTHENTICATED", "Invalid email or password");
      }

      if (!user.isApproved) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "Your account is pending approval. Please contact an administrator.",
        );
      }

      const legacy = await countLegacyPasswords(user.id);

      issueSession(res, user, rememberMe);
      return ok(res, {
        user: User.toPublic(user),
        hasLegacyPasswords: legacy.hasLegacyPasswords,
        legacyPasswordCount: legacy.legacyPasswordCount,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.logout = async (req, res) => {
  res.clearCookie(AUTH_COOKIE, clearCookieOptions());
  return ok(res, {});
};

/**
 * Hands the CSRF token to the client. The value is minted (or reused) by
 * middleware/csrfProtection.js on this same request, so the cookie and the body always agree.
 */
exports.getCsrfToken = (req, res) => ok(res, { token: req.csrfToken });

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id, "-password");
    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }
    return ok(res, { user: User.toPublic(user) });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 32 })
    .withMessage("Username must be 3-32 characters")
    .matches(USERNAME_RULE)
    .withMessage("Username may only contain letters, numbers, dot, dash and underscore"),

  async (req, res, next) => {
    try {
      const invalid = failValidation(req);
      if (invalid) throw invalid;

      const { username } = matchedData(req);
      const taken = await User.findOne({ username });
      if (taken && taken.id !== req.user.id) {
        throw new ApiError(409, "CONFLICT", "That username is already taken");
      }

      const updated = await User.findOneAndUpdate(
        { id: req.user.id },
        { username },
      );
      return ok(res, { user: User.toPublic(updated) });
    } catch (error) {
      next(error);
    }
  },
];

exports.changePassword = [
  body("currentPassword").isString().notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isString()
    .withMessage("New password is required")
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }
      return true;
    }),

  async (req, res, next) => {
    try {
      const invalid = failValidation(req);
      if (invalid) throw invalid;

      const { currentPassword, newPassword } = req.body;
      const user = await User.findOne({ id: req.user.id });
      if (!user) {
        throw new ApiError(404, "NOT_FOUND", "User not found");
      }

      const matches = await bcrypt.compare(
        currentPassword,
        user.password_hash || user.password,
      );
      if (!matches) {
        throw new ApiError(401, "UNAUTHENTICATED", "Current password is incorrect");
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await User.findOneAndUpdate({ id: req.user.id }, { password_hash: hash });

      return ok(res, {});
    } catch (error) {
      next(error);
    }
  },
];

exports.createUserByAdmin = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 32 })
    .withMessage("Username must be 3-32 characters")
    .matches(USERNAME_RULE)
    .withMessage("Username may only contain letters, numbers, dot, dash and underscore"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail({ gmail_remove_dots: false, all_lowercase: true }),

  body("password")
    .isString()
    .withMessage("Password is required")
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }
      return true;
    }),

  body("isAdmin").optional().isBoolean().toBoolean(),

  async (req, res, next) => {
    try {
      const invalid = failValidation(req);
      if (invalid) throw invalid;

      const { username, email, password, isAdmin = false } = matchedData(req);

      if (await User.findOne({ email })) {
        throw new ApiError(409, "CONFLICT", "An account with this email already exists");
      }
      if (await User.findOne({ username })) {
        throw new ApiError(409, "CONFLICT", "That username is already taken");
      }

      const saved = await new User({
        username,
        email,
        password,
        isApproved: true,
        isAdmin,
      }).save();

      return ok(res, { user: User.toPublic(saved) }, 201);
    } catch (error) {
      next(error);
    }
  },
];

exports.getRegistrationStatus = async (req, res, next) => {
  try {
    const allowRegistration = await Settings.getSetting("allow_registration");
    return ok(res, { allow_registration: allowRegistration !== false });
  } catch (error) {
    next(error);
  }
};
