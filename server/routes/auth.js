// Debug: Log raw request body for login
const fs = require('fs');
const path = require('path');
const debugLog = (req, res, next) => {
  if (req.path === '/login' && req.method === 'POST') {
    fs.appendFileSync(
      path.join(__dirname, '../server.log'),
      `RAW BODY: ${JSON.stringify(req.body)}\n`
    );
  }
  next();
};
const express = require('express');
const router = express.Router();
const { register, login, getMe, createUserByAdmin, getRegistrationStatus, setRegistrationStatus } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');


router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/admin', protect, authorize('Admin'), (req, res) => {
  res.status(200).json({ success: true, data: 'Welcome Admin' });
});

// Admin routes
router.post('/create-user', protect, adminMiddleware, createUserByAdmin);
router.get('/registration-status', getRegistrationStatus);
router.post('/registration-status', protect, adminMiddleware, setRegistrationStatus);

// Password reset endpoint
// TODO: Implement resetPassword in authController
// const { resetPassword } = require('../controllers/authController');
// router.post('/reset-password', resetPassword);

module.exports = router;