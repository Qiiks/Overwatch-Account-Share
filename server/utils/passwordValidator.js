const Joi = require('joi');

/**
 * Enhanced password validation schema
 */
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    'any.required': 'Password is required'
  });

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validatePassword = (password) => {
  const { error } = passwordSchema.validate(password);
  return {
    isValid: !error,
    errors: error ? error.details.map(detail => detail.message) : []
  };
};

/**
 * Check password strength score (0-4)
 * @param {string} password - The password to check
 * @returns {number} - Strength score (0=very weak, 4=very strong)
 */
const getPasswordStrength = (password) => {
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  // Bonus for longer passwords
  if (password.length >= 16) score++;

  return Math.min(score, 4);
};

/**
 * Get password strength description
 * @param {number} score - Strength score
 * @returns {string} - Description
 */
const getPasswordStrengthDescription = (score) => {
  const descriptions = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Very Strong'
  };
  return descriptions[score] || 'Unknown';
};

module.exports = {
  validatePassword,
  getPasswordStrength,
  getPasswordStrengthDescription,
  passwordSchema
};