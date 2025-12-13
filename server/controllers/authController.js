const User = require("../models/User");
const Settings = require("../models/Settings");
const jwt = require("jsonwebtoken");
const { body, validationResult, matchedData } = require("express-validator");
const bcrypt = require("bcrypt");
const { validatePassword } = require("../utils/passwordValidator");
const { logger } = require("../utils/logger");

exports.register = [
  // Validate and sanitize inputs
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .escape(),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail({
      gmail_remove_dots: false,
      all_lowercase: true,
    }),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }
      return true;
    }),

  // Process request after validation
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array(),
      });
    }

    // Check if registration is allowed
    try {
      const allowRegistration = await Settings.getSetting("allow_registration");
      // If setting exists and is false, reject registration
      if (allowRegistration === false) {
        return res.status(403).json({
          success: false,
          error:
            "User registration is currently disabled by the administrator.",
        });
      }
      // If setting is true or doesn't exist (null), allow registration to proceed
    } catch (error) {
      logger.error("Error checking registration settings:", error);
      // If there's an error checking settings, we'll allow registration to proceed
      // to avoid blocking legitimate users due to system errors
    }

    const { username, password, email } = req.body;

    try {
      const newUser = new User({
        username,
        password,
        email,
      });

      const savedUser = await newUser.save();

      res.status(201).json({
        success: true,
        data: {
          id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          role: savedUser.role,
        },
      });
    } catch (error) {
      // Pass error to centralized error handler
      next(error);
    }
  },
];

exports.login = [
  // Validate and sanitize inputs
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail({
      gmail_remove_dots: false,
      all_lowercase: true,
    }),

  body("password").trim().notEmpty().withMessage("Password is required"),

  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me flag must be a boolean")
    .toBoolean(),

  // Process request after validation
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Get the matched/sanitized data from validator
    const { email: sanitizedEmail, rememberMe = false } = matchedData(req);

    try {
      const user = await User.findOne({ email: sanitizedEmail });

      if (!user) {
        // Return 404 when user is not found
        return res.status(404).json({
          message: "User not found",
        });
      }

      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      // Check if user is approved
      if (!user.isApproved) {
        return res.status(403).json({
          success: false,
          error:
            "Your account is pending approval. Please contact an administrator.",
        });
      }

      // Check if JWT_SECRET is available
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          success: false,
          error: "Server configuration error",
        });
      }

      let token;
      try {
        const tokenExpiry = rememberMe ? "7d" : "1h";
        token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: tokenExpiry,
        });
      } catch (jwtError) {
        return res.status(500).json({
          success: false,
          error: "Error generating authentication token",
        });
      }

      const expiryMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
      const tokenExpiresAt = new Date(Date.now() + expiryMs).toISOString();

      // SECURITY ENHANCEMENT: Check for legacy bcrypt Overwatch account passwords
      // These need to be manually updated to AES encryption for credential viewing
      let hasLegacyPasswords = false;
      let legacyPasswordCount = 0;

      try {
        const { data: userAccounts, error: accountsError } =
          await require("../config/db")
            .supabase.from("overwatch_accounts")
            .select("id, password_encryption_type")
            .eq("owner_id", user._id);

        if (!accountsError && userAccounts) {
          const legacyAccounts = userAccounts.filter(
            (account) => account.password_encryption_type === "bcrypt"
          );
          hasLegacyPasswords = legacyAccounts.length > 0;
          legacyPasswordCount = legacyAccounts.length;

          if (hasLegacyPasswords) {
            logger.logger.info("[SECURITY] User has legacy bcrypt passwords", {
              userId: user._id,
              legacyCount: legacyPasswordCount,
            });
          }
        }
      } catch (accountCheckError) {
        // Non-critical error - don't block login
        logger.logger.warn("[SECURITY] Failed to check for legacy passwords", {
          error: accountCheckError.message,
          userId: user._id,
        });
      }

      // Set JWT as httpOnly cookie for enhanced security
      // This prevents XSS attacks from stealing the token
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: expiryMs,
        path: "/",
      });

      res.status(200).json({
        success: true,
        token, // Keep for backward compatibility during transition
        tokenExpiresAt,
        id: user._id, // Add user ID to response
        role: user.role || "user",
        isAdmin: !!user.isAdmin,
        username: user.username,
        email: user.email, // Also include email for completeness
        isApproved: user.isApproved,
        // Security notification flags
        hasLegacyPasswords: hasLegacyPasswords,
        legacyPasswordCount: legacyPasswordCount,
      });
    } catch (error) {
      // Pass error to centralized error handler
      next(error);
    }
  },
];

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    // Pass error to centralized error handler
    next(error);
  }
};

// Admin user creation
exports.createUserByAdmin = [
  // Validate and sanitize inputs
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .escape(),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail({
      gmail_remove_dots: false,
      all_lowercase: true,
    }),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }
      return true;
    }),

  // Process request after validation
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array(),
      });
    }

    const { username, email, password, isAdmin } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "User with this email or username already exists",
        });
      }

      // Hash the password before saving
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        isApproved: true,
        isAdmin: isAdmin || false,
      });

      const savedUser = await newUser.save();

      res.status(201).json({
        success: true,
        data: {
          id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          isAdmin: savedUser.isAdmin,
          isApproved: savedUser.isApproved,
        },
      });
    } catch (error) {
      // Pass error to centralized error handler
      next(error);
    }
  },
];

// Registration toggle functionality
exports.getRegistrationStatus = async (req, res, next) => {
  try {
    // For simplicity, we'll use an environment variable
    // In a production app, this would be stored in a database collection
    const isRegistrationOpen =
      process.env.REGISTRATION_OPEN === "true" || false;

    res.status(200).json({
      success: true,
      data: {
        isRegistrationOpen,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.setRegistrationStatus = [
  // Validate input
  body("isRegistrationOpen")
    .isBoolean()
    .withMessage("Registration status must be a boolean"),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array(),
      });
    }

    const { isRegistrationOpen } = req.body;

    try {
      // In a production app, this would update a database collection
      // For simplicity, we'll just return success
      // The actual implementation would depend on how you want to store this setting

      res.status(200).json({
        success: true,
        data: {
          isRegistrationOpen,
          message: "Registration status updated successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Logout user by clearing the httpOnly auth cookie
 * @route POST /api/auth/logout
 * @access Public
 */
exports.logout = async (req, res) => {
  // Clear the httpOnly auth cookie
  res.cookie("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    expires: new Date(0), // Expire immediately
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
