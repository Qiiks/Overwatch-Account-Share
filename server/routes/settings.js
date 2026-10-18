const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Admin-only settings view. The registration gate has one writer
// (POST /api/admin/toggle-registrations) and two reads: this route and the public
// GET /api/auth/registration-status.
router.get('/', protect, adminMiddleware, settingsController.getSettings);

module.exports = router;
