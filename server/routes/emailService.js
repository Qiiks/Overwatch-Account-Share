const express = require('express');
const router = express.Router();
const {
  addEmailService,
  getEmailServices,
  updateEmailService,
  deleteEmailService,
  toggleEmailServiceStatus
} = require('../controllers/emailServiceController');
const { protect } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All routes are protected and require admin privileges
router.use(protect);
router.use(adminMiddleware);

// @route   POST /api/email-service
// @desc    Add a new email service configuration
// @access  Private/Admin
router.post('/', addEmailService);

// @route   GET /api/email-service
// @desc    Get all email service configurations
// @access  Private/Admin
router.get('/', getEmailServices);

// @route   PUT /api/email-service/:id
// @desc    Update an email service configuration
// @access  Private/Admin
router.put('/:id', updateEmailService);

// @route   DELETE /api/email-service/:id
// @desc    Delete an email service configuration
// @access  Private/Admin
router.delete('/:id', deleteEmailService);

// @route   PATCH /api/email-service/:id/toggle
// @desc    Toggle active status of an email service
// @access  Private/Admin
router.patch('/:id/toggle', toggleEmailServiceStatus);

module.exports = router;