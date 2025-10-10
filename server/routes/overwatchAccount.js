const express = require('express');
const router = express.Router();
const {
  addAccount,
  getAccounts,
  updateAccount,
  updateAccountAccess,
  getUsersForSharing,
  deleteAccount,
  getAccountCredentials,
  getAllAccountsWithConditionalCredentials
} = require('../controllers/overwatchAccountController');
const { protect } = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('express-rate-limit');

// Aggressive rate limiting for credential endpoints (security critical)
const credentialRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many credential requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes are now correctly mapped to /api/overwatch-accounts/*
router.post('/', protect, addAccount);
router.get('/', protect, getAccounts);
router.get('/all-public', optionalAuth, getAllAccountsWithConditionalCredentials); // Public endpoint with optional auth for conditional display
router.put('/:id', protect, updateAccount);
router.put('/:id/access', protect, updateAccountAccess);
router.get('/users', protect, getUsersForSharing);
router.get('/:id/credentials', credentialRateLimit, protect, getAccountCredentials); // CRITICAL: Rate limited credential endpoint
router.delete('/:id', protect, deleteAccount);

module.exports = router;