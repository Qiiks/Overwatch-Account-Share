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
  getAllAccountsWithConditionalCredentials,
  shareAccountByEmail
} = require('../controllers/overwatchAccountController');
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Aggressive rate limiting for credential endpoints (security critical)
const credentialRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: { message: 'Too many credential requests, please try again later.', code: 'RATE_LIMITED' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes are now correctly mapped to /api/overwatch-accounts/*
router.post('/', protect, addAccount);
router.get('/', protect, getAccounts);
// Authenticated roster: decrypted battletags are community data, credentials stay masked.
router.get('/all-public', protect, credentialRateLimit, getAllAccountsWithConditionalCredentials);
router.put('/:id', protect, updateAccount);
router.put('/:id/access', protect, updateAccountAccess);
router.get('/users', protect, getUsersForSharing);
router.get('/:id/credentials', credentialRateLimit, protect, getAccountCredentials);
router.delete('/:id', protect, deleteAccount);
router.post('/:id/share-by-email', protect, shareAccountByEmail);

module.exports = router;
