const express = require("express");
const router = express.Router();
const {
  getStats,
  getUsers,
  listUsers,
  updateUserStatus,
  updateUserStatusValidation,
  updateUserRole,
  updateUserRoleValidation,
  deleteUser,
  getLogs,
  getAdminDashboard,
  getRegistrationStatus,
  toggleRegistrations,
  createUser,
  exportUserData,
  shareAccountAccess,
  searchAccountsUsers,
  forceLogoutAll,
  performSystemMaintenance,
  exportAllUsers,
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// All routes in this file are protected and require admin privileges
router.use(protect, adminMiddleware);

// @route   GET /api/admin/stats
// @desc    Get admin statistics
// @access  Admin
router.get("/stats", getStats);

// @route   GET /api/admin/users
// @desc    Get all users (listUsers)
// @access  Admin
router.get("/users", listUsers);

// @route   PATCH /api/admin/users/:id/status
// @desc    Update user status
// @access  Admin
router.patch("/users/:id/status", updateUserStatusValidation, updateUserStatus);

// @route   PATCH /api/admin/users/:id/role
// @desc    Update user role (make admin/remove admin)
// @access  Admin
router.patch("/users/:id/role", updateUserRoleValidation, updateUserRole);

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Admin
router.delete("/users/:id", deleteUser);

// @route   GET /api/admin/users/:id/export
// @desc    Export user data (GDPR compliance)
// @access  Admin
router.get("/users/:id/export", exportUserData);

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Admin
router.post("/users", createUser);

// @route   GET /api/admin/logs
// @desc    Get system logs
// @access  Admin
router.get("/logs", getLogs);

// @route   GET /api/admin/dashboard
// @desc    Get all admin data
// @access  Admin
router.get("/dashboard", getAdminDashboard);

// @route   GET /api/admin/registration-status
// @desc    Get current registration status
// @access  Admin
router.get("/registration-status", getRegistrationStatus);

// @route   POST /api/admin/toggle-registrations
// @desc    Enable/disable user registrations
// @access  Admin
router.post("/toggle-registrations", toggleRegistrations);

// Legacy route for backward compatibility
// @route   POST /api/admin/create-user
// @desc    Create a new user (legacy endpoint)
// @access  Admin
router.post("/create-user", createUser);

// @route   POST /api/admin/share-account
// @desc    Grant account access to a specific user
// @access  Admin
router.post("/share-account", shareAccountAccess);

// @route   GET /api/admin/search
// @desc    Search for accounts or users
// @access  Admin
router.get("/search", searchAccountsUsers);

// @route   POST /api/admin/force-logout
// @desc    Force logout all users
// @access  Admin
router.post("/force-logout", forceLogoutAll);

// @route   POST /api/admin/clear-cache
// @desc    Clear system cache
// @access  Admin
router.post("/clear-cache", performSystemMaintenance);

// @route   GET /api/admin/export-users
// @desc    Export all users as CSV
// @access  Admin
router.get("/export-users", exportAllUsers);

module.exports = router;
