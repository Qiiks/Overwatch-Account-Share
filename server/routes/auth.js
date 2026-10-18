const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  createUserByAdmin,
  getRegistrationStatus,
  setRegistrationStatus,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.get("/admin", protect, authorize("Admin"), (req, res) => {
  res.status(200).json({ success: true, data: "Welcome Admin" });
});

// Admin routes
router.post("/create-user", protect, adminMiddleware, createUserByAdmin);
router.get("/registration-status", getRegistrationStatus);
router.post(
  "/registration-status",
  protect,
  adminMiddleware,
  setRegistrationStatus
);

// Password reset endpoint
// TODO: Implement resetPassword in authController
// const { resetPassword } = require('../controllers/authController');
// router.post('/reset-password', resetPassword);

module.exports = router;
