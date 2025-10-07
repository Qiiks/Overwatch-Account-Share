const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { body, validationResult, matchedData } = require('express-validator');
const bcrypt = require('bcrypt');
const { validatePassword } = require('../utils/passwordValidator');

exports.register = [
  // Validate and sanitize inputs
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .escape(),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail({
      gmail_remove_dots: false,
      all_lowercase: true
    }),
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),

  // Process request after validation
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()
      });
    }

    const { username, password, email } = req.body;

    try {
      const newUser = new User({
        username,
        password,
        email
      });

      const savedUser = await newUser.save();

      res.status(201).json({
        success: true,
        data: {
          id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          role: savedUser.role
        }
      });
    } catch (error) {
      // Pass error to centralized error handler
      next(error);
    }
  }
];

exports.login = [
  // Validate and sanitize inputs
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail({
      gmail_remove_dots: false,
      all_lowercase: true
    }),
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required'),

  // Process request after validation
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()
      });
    }

    const { email, password } = req.body;
    
    // Get the matched/sanitized data from validator
    const { email: sanitizedEmail } = matchedData(req);

    try {
      const user = await User.findOne({ email: sanitizedEmail });

      if (!user) {
        // Use 401 instead of 404 for security reasons - don't reveal if user exists
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Check if user is approved
      if (!user.isApproved) {
        return res.status(403).json({
          success: false,
          error: 'Your account is pending approval. Please contact an administrator.'
        });
      }
      
      // Check if JWT_SECRET is available
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          success: false,
          error: 'Server configuration error'
        });
      }
      
      let token;
      try {
        token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: '1h'
        });
      } catch (jwtError) {
        return res.status(500).json({
          success: false,
          error: 'Error generating authentication token'
        });
      }

      res.status(200).json({
        success: true,
        token,
        role: user.role || 'user',
        isAdmin: !!user.isAdmin,
        username: user.username,
        isApproved: user.isApproved
      });
    } catch (error) {
      // Pass error to centralized error handler
      next(error);
    }
  }
];

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    // Pass error to centralized error handler
    next(error);
  }
};

// Admin user creation
exports.createUserByAdmin = [
  // Validate and sanitize inputs
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .escape(),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail({
      gmail_remove_dots: false,
      all_lowercase: true
    }),
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),

  // Process request after validation
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()
      });
    }

    const { username, email, password, isAdmin } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email or username already exists'
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
        isAdmin: isAdmin || false
      });

      const savedUser = await newUser.save();

      res.status(201).json({
        success: true,
        data: {
          id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          isAdmin: savedUser.isAdmin,
          isApproved: savedUser.isApproved
        }
      });
    } catch (error) {
      // Pass error to centralized error handler
      next(error);
    }
  }
];

// Registration toggle functionality
exports.getRegistrationStatus = async (req, res, next) => {
  try {
    // For simplicity, we'll use an environment variable
    // In a production app, this would be stored in a database collection
    const isRegistrationOpen = process.env.REGISTRATION_OPEN === 'true' || false;
    
    res.status(200).json({
      success: true,
      data: {
        isRegistrationOpen
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.setRegistrationStatus = [
  // Validate input
  body('isRegistrationOpen')
    .isBoolean().withMessage('Registration status must be a boolean'),
  
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()
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
          message: 'Registration status updated successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  }
];