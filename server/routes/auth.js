const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  createUserByAdmin,
  getRegistrationStatus,
  getCsrfToken,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/csrf", getCsrfToken);

router.get("/me", protect, getMe);
router.patch("/me", protect, updateProfile);
router.post("/change-password", protect, changePassword);

router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.status(200).json({ success: true, data: "Welcome Admin" });
});

// Admin routes
router.post("/create-user", protect, adminMiddleware, createUserByAdmin);
// Public read of the registration gate. The single writer is POST /api/admin/toggle-registrations.
router.get("/registration-status", getRegistrationStatus);

module.exports = router;
