const express = require('express');
const router = express.Router();
const {
    getStats,
    getUsers,
    updateUserStatus,
    getLogs,
    getAdminDashboard,
    getRegistrationStatus,
    toggleRegistrations,
    createUser,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All routes in this file are protected and require admin privileges
router.use(protect, adminMiddleware);

// @route   GET /api/admin/stats
// @desc    Get admin statistics
// @access  Admin
router.get('/stats', getStats);

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', getUsers);

// @route   PATCH /api/admin/users/:id/status
// @desc    Update user status
// @access  Admin
router.patch('/users/:id/status', updateUserStatus);

// @route   GET /api/admin/logs
// @desc    Get system logs
// @access  Admin
router.get('/logs', getLogs);

// @route   GET /api/admin/dashboard
// @desc    Get all admin data
// @access  Admin
router.get('/dashboard', getAdminDashboard);

// @route   GET /api/admin/registration-status
// @desc    Get current registration status
// @access  Admin
router.get('/registration-status', getRegistrationStatus);

// @route   POST /api/admin/toggle-registrations
// @desc    Enable/disable user registrations
// @access  Admin
router.post('/toggle-registrations', toggleRegistrations);

// @route   POST /api/admin/create-user
// @desc    Create a new user
// @access  Admin
router.post('/create-user', createUser);

module.exports = router;