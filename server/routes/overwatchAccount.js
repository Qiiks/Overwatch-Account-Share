const express = require('express');
const router = express.Router();
const { addAccount, getAccounts, updateAccount, updateAccountAccess, getUsersForSharing, deleteAccount } = require('../controllers/overwatchAccountController');
const { protect } = require('../middleware/authMiddleware');

// Routes are now correctly mapped to /api/overwatch-accounts/*
router.post('/', protect, addAccount);
router.get('/', protect, getAccounts);
router.put('/:id', protect, updateAccount);
router.put('/:id/access', protect, updateAccountAccess);
router.get('/users', protect, getUsersForSharing);
router.delete('/:id', protect, deleteAccount);

module.exports = router;