const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const googleAuthController = require('../controllers/googleAuthController');

// Google OAuth routes for OTP account linking
router.post('/otp/init', protect, googleAuthController.initGoogleOTPAuth);
router.get('/otp/callback', googleAuthController.googleOTPCallback);

// Google account management routes
router.get('/accounts', protect, googleAuthController.listGoogleAccounts);
router.delete('/accounts/:id', protect, googleAuthController.deleteGoogleAccount);

module.exports = router;
