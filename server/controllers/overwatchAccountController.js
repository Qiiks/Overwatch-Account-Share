const {
  createOverwatchAccount,
  findOverwatchAccountByAccountTag,
  findOverwatchAccountByAccountEmail,
  findOverwatchAccountByOwnerId,
  findOverwatchAccountById,
  updateOverwatchAccount,
  deleteOverwatchAccount,
  getAccessibleAccounts
} = require('../models/OverwatchAccount');
const dbClient = require('../config/db');
const supabase = dbClient.supabase;
const { body, validationResult } = require('express-validator');

exports.addAccount = [
  // Validate and sanitize inputs - accept both frontend field names and backend field names
  body('battletag')
    .if(body('battletag').exists())
    .trim()
    .notEmpty().withMessage('Battletag is required')
    .isLength({ min: 3 }).withMessage('Battletag must be at least 3 characters')
    .escape(),
  
  body('accountTag')
    .if(body('accountTag').exists())
    .trim()
    .notEmpty().withMessage('Battletag is required')
    .isLength({ min: 3 }).withMessage('Battletag must be at least 3 characters')
    .escape(),

  body('email')
    .if(body('email').exists())
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('accountEmail')
    .if(body('accountEmail').exists())
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .if(body('password').exists())
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .escape(),
  
  body('accountPassword')
    .if(body('accountPassword').exists())
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .escape(),

  // Validate googleAccountId - optional but should be a valid UUID if provided
  body('googleAccountId')
    .optional({ checkFalsy: true })
    .trim()
    .isUUID().withMessage('Invalid Google Account ID'),
  
  // Notes field - optional (not stored in DB currently)
  body('notes')
    .optional()
    .trim()
    .escape(),

  // Process request after validation
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        success: false,
        error: errors.array()
      });
    }

    // Support both field naming conventions
    const accountTag = req.body.battletag || req.body.accountTag;
    const accountEmail = req.body.email || req.body.accountEmail;
    const accountPassword = req.body.password || req.body.accountPassword;
    const googleAccountId = req.body.googleAccountId;
    
    console.log('Processing account creation with:', {
      accountTag,
      accountEmail,
      googleAccountId,
      owner_id: req.user.id
    });

    try {
      // Bypass double-check for testing

      const newAccount = await createOverwatchAccount({
        accountTag: accountTag,  // Model will handle the mapping to lowercase
        accountEmail,
        accountPassword,
        owner_id: req.user.id,
        linked_google_account_id: googleAccountId || null // Map to correct column name
      });

      res.status(201).json({
        success: true,
        data: {
          ...newAccount,
          accountTag: newAccount.accounttag,
        }
      });
    } catch (error) {
      // Pass error to centralized error handler
      next(error);
    }
  }
];

exports.getAccounts = async (req, res, next) => {
  const startTime = process.hrtime.bigint();
  console.log('[PERF] Get accounts request started for user:', req.user.id);

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get accessible accounts
    const allAccounts = await getAccessibleAccounts(req.user.id);

    // Apply search filter
    let filteredAccounts = allAccounts;
    if (req.query.search) {
      filteredAccounts = allAccounts.filter(account =>
        account.accounttag && account.accounttag.toLowerCase().includes(req.query.search.toLowerCase())
      );
      console.log('[PERF] Search query applied:', req.query.search);
    }

    // Apply sorting
    const sortOption = req.query.sort || '-createdAt';
    const sortField = sortOption.replace('-', '');
    const sortDirection = sortOption.startsWith('-') ? -1 : 1;

    filteredAccounts.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return sortDirection * -1;
      if (aVal > bVal) return sortDirection;
      return 0;
    });

    // Apply pagination
    const paginatedAccounts = filteredAccounts.slice(skip, skip + limit);

    // Add isOwner field to each account and map accounttag to accountTag
    const accountsWithOwnership = paginatedAccounts.map(account => {
      const isOwner = account.owner_id === req.user.id;
      return {
        ...account,
        accountTag: account.accounttag,
        isOwner
      };
    });

    const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
    console.log(`[PERF] Get accounts request completed in ${totalDuration.toFixed(2)}ms`);

    res.status(200).json({
      success: true,
      data: accountsWithOwnership,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredAccounts.length / limit),
        totalItems: filteredAccounts.length,
        itemsPerPage: limit,
        hasNext: page * limit < filteredAccounts.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
    console.error(`[PERF] Get accounts request failed after ${totalDuration.toFixed(2)}ms:`, { error: error.message, stack: error.stack });
    // Pass error to centralized error handler
    next(error);
  }
};

exports.updateAccount = [
  // Optional validations for partial update
  body('accountTag')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Account tag must be at least 3 characters')
    .escape(),

  body('accountEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  // Also support frontend field names
  body('battletag')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Battletag must be at least 3 characters')
    .escape(),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .optional()
    .trim()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .escape(),

  body('accountPassword')
    .optional()
    .trim()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .escape(),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()
      });
    }

    const accountId = req.params.id;

    try {
      // Ensure the account exists and the requester is the owner
      const account = await findOverwatchAccountById(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: [{ msg: 'Account not found' }]
        });
      }

      if (account.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: [{ msg: 'Not authorized to update this account' }]
        });
      }

      // Build update payload from allowed fields only
      const updateData = {};
      
      // Support both frontend field names (battletag, email, password) and backend field names
      const battletag = req.body.battletag || req.body.accountTag;
      const email = req.body.email || req.body.accountEmail;
      const password = req.body.password || req.body.accountPassword;
      const googleAccountId = req.body.googleAccountId;
      
      // Map incoming fields to expected format
      if (battletag !== undefined && battletag !== '') {
        updateData.accountTag = battletag;
      }
      if (email !== undefined && email !== '') {
        updateData.accountEmail = email;
      }
      if (password !== undefined && password !== '') {
        updateData.accountPassword = password;
      }
      if (googleAccountId !== undefined && googleAccountId !== '') {
        updateData.linked_google_account_id = googleAccountId;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: [{ msg: 'No valid fields provided for update' }]
        });
      }

      const updatedAccount = await updateOverwatchAccount(accountId, updateData);
      return res.status(200).json({
        success: true,
        data: {
          ...updatedAccount,
          accountTag: updatedAccount.accounttag,
        }
      });
    } catch (error) {
      next(error);
    }
  }
];

exports.updateAccountAccess = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const accountId = req.params.id;

    // Find the account
    const account = await findOverwatchAccountById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: [{ msg: 'Account not found' }]
      });
    }

    // Check if the user is the owner of the account
    if (account.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: [{ msg: 'Not authorized to update this account' }]
      });
    }

    // First, remove all existing allowed users
    await supabase
      .from('overwatch_account_allowed_users')
      .delete()
      .eq('overwatch_account_id', accountId);

    // Then, add the new allowed users
    if (userIds && userIds.length > 0) {
      const allowedUsersData = userIds.map(userId => ({
        overwatch_account_id: accountId,
        user_id: userId
      }));

      const { error } = await supabase
        .from('overwatch_account_allowed_users')
        .insert(allowedUsersData);

      if (error) {
        throw error;
      }
    }

    // Get updated account with allowed users
    const { data: updatedAccount, error: fetchError } = await supabase
      .from('overwatch_accounts')
      .select(`
        *,
        overwatch_account_allowed_users!inner(user_id)
      `)
      .eq('id', accountId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    res.status(200).json({
      success: true,
      data: {
        ...updatedAccount,
        accountTag: updatedAccount.accounttag,
      }
    });
  } catch (error) {
    // Pass error to centralized error handler
    next(error);
  }
};

exports.getUsersForSharing = async (req, res, next) => {
  try {
    // Get all users except the current user
    const { data: users, error } = await supabase
      .from('users')
      .select('username, email, id')
      .neq('id', req.user.id);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    // Pass error to centralized error handler
    next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const account = await findOverwatchAccountById(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: [{ msg: 'Account not found' }]
      });
    }

    // Check if the user is the owner of the account
    if (account.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: [{ msg: 'Not authorized to delete this account' }]
      });
    }

    await deleteOverwatchAccount(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    // Pass error to centralized error handler
    next(error);
  }
};