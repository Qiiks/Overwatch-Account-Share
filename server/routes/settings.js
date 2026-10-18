const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Admin-only: the registration gate for the public site lives on
// GET /api/auth/registration-status; this route is the full settings view.
router.get('/', protect, adminMiddleware, settingsController.getSettings);

// Admin-only endpoint - requires authentication and admin privileges
// PATCH /api/settings/registration
router.patch('/registration', protect, adminMiddleware, settingsController.updateRegistrationSetting);

module.exports = router;
