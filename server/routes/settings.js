const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public endpoint - no authentication required
// GET /api/settings
router.get('/', settingsController.getPublicSettings);

// Admin-only endpoint - requires authentication and admin privileges
// PATCH /api/settings/registration
router.patch('/registration', protect, adminMiddleware, settingsController.updateRegistrationSetting);

module.exports = router;