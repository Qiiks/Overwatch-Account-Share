const express = require('express');
const router = express.Router();
const { getActiveEmailServices } = require('../controllers/emailServiceController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/email/services
// @desc    Get all active email service configurations
// @access  Private
router.get('/services', protect, getActiveEmailServices);

module.exports = router;