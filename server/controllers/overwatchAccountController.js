const {
  createOverwatchAccount,
  findOverwatchAccountByAccountTag,
  findOverwatchAccountByAccountEmail,
  findOverwatchAccountByOwnerId,
  findOverwatchAccountById,
  updateOverwatchAccount,
  deleteOverwatchAccount,
  getAccessibleAccounts,
  getDecryptedPassword,
} = require("../models/OverwatchAccount");
const dbClient = require("../config/db");
const supabase = dbClient.supabase;
const { body, validationResult } = require("express-validator");
const { getNormalizedEmail } = require("../utils/emailNormalizer");
const { decrypt } = require("../utils/encryption");
const { cache, cacheKeys } = require("../utils/cache");
const {
  logger,
  performanceLogger,
  securityLogger,
} = require("../utils/logger");
const { extractAccountFields } = require("../utils/fieldNormalizer");

exports.addAccount = [
  // Validate and sanitize inputs - accept both frontend field names and backend field names
  body("battletag")
    .if(body("battletag").exists())
    .trim()
    .notEmpty()
    .withMessage("Battletag is required")
    .isLength({ min: 3 })
    .withMessage("Battletag must be at least 3 characters")
    .escape(),

  body("accountTag")
    .if(body("accountTag").exists())
    .trim()
    .notEmpty()
    .withMessage("Battletag is required")
    .isLength({ min: 3 })
    .withMessage("Battletag must be at least 3 characters")
    .escape(),

  body("email")
    .if(body("email").exists())
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),
  // CRITICAL: Do NOT use .normalizeEmail() - we need to preserve exact email format with dots

  body("accountEmail")
    .if(body("accountEmail").exists())
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),
  // CRITICAL: Do NOT use .normalizeEmail() - we need to preserve exact email format with dots

  body("password")
    .if(body("password").exists())
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .escape(),

  body("accountPassword")
    .if(body("accountPassword").exists())
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .escape(),

  // Validate googleAccountId - optional but should be a valid UUID if provided
  body("googleAccountId")
    .optional({ checkFalsy: true })
    .trim()
    .isUUID()
    .withMessage("Invalid Google Account ID"),

  // Notes field - optional (not stored in DB currently)
  body("notes").optional().trim().escape(),

  // Process request after validation
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (process.env.NODE_ENV !== "production") {
        logger.debug("Validation errors:", errors.array());
        logger.debug("Request body:", req.body);
      }
      return res.status(400).json({
        success: false,
        error: errors.array(),
      });
    }

    // Use field normalizer for consistent field extraction with backward compatibility
    const { accountTag, accountEmail, accountPassword } = extractAccountFields(
      req.body,
    );
    const googleAccountId = req.body.googleAccountId;

    logger.debug("Processing account creation", {
      accountTag,
      hasEmail: !!accountEmail,
      hasGoogleAccount: !!googleAccountId,
      owner_id: req.user.id,
    });

    try {
      // Check for exact duplicates of accountTag
      const existingAccountByTag =
        await findOverwatchAccountByAccountTag(accountTag);
      if (existingAccountByTag) {
        return res.status(400).json({
          success: false,
          error: [{ msg: "An account with this Battletag already exists" }],
        });
      }

      // Check for exact duplicates of accountEmail
      // NOTE: We allow multiple accounts with the same normalized email (aliases)
      // but not the exact same email address
      const existingAccountByEmail =
        await findOverwatchAccountByAccountEmail(accountEmail);
      if (existingAccountByEmail) {
        return res.status(400).json({
          success: false,
          error: [{ msg: "An account with this email address already exists" }],
        });
      }

      const newAccount = await createOverwatchAccount({
        accountTag: accountTag, // Model will handle the mapping to lowercase
        accountEmail,
        accountPassword,
        owner_id: req.user.id,
        linked_google_account_id: googleAccountId || null, // Map to correct column name
      });

      // Decrypt accountTag for response
      let decryptedAccountTag = newAccount.accounttag;
      try {
        decryptedAccountTag = decrypt(newAccount.accounttag);
      } catch (error) {
        // If decryption fails, assume it's already plaintext
        decryptedAccountTag = newAccount.accounttag;
      }

      res.status(201).json({
        success: true,
        data: {
          ...newAccount,
          accountTag: decryptedAccountTag,
        },
      });
    } catch (error) {
      // Pass error to centralized error handler
      next(error);
    }
  },
];

exports.getAccounts = async (req, res, next) => {
  const startTime = process.hrtime.bigint();
  logger.debug("[PERF] Get accounts request started", { userId: req.user.id });

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get accessible accounts
    const allAccounts = await getAccessibleAccounts(req.user.id);

    // Apply search filter
    let filteredAccounts = allAccounts;
    if (req.query.search) {
      filteredAccounts = allAccounts.filter(
        (account) =>
          account.accounttag &&
          account.accounttag
            .toLowerCase()
            .includes(req.query.search.toLowerCase()),
      );
      logger.debug("[PERF] Search query applied", { query: req.query.search });
    }

    // Apply sorting
    const sortOption = req.query.sort || "-createdAt";
    const sortField = sortOption.replace("-", "");
    const sortDirection = sortOption.startsWith("-") ? -1 : 1;

    filteredAccounts.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return sortDirection * -1;
      if (aVal > bVal) return sortDirection;
      return 0;
    });

    // Apply pagination
    const paginatedAccounts = filteredAccounts.slice(skip, skip + limit);

    // Add isOwner field to each account and map accounttag to accountTag with decryption
    const accountsWithOwnership = paginatedAccounts.map((account) => {
      const isOwner = account.owner_id === req.user.id;

      // Decrypt accountTag if it's encrypted
      let decryptedAccountTag = account.accounttag;
      try {
        decryptedAccountTag = decrypt(account.accounttag);
      } catch (error) {
        // If decryption fails, assume it's already plaintext (old data)
        decryptedAccountTag = account.accounttag;
      }

      return {
        ...account,
        accountTag: decryptedAccountTag,
        isOwner,
      };
    });

    const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
    performanceLogger.logApiCall(
      "GET",
      "/api/overwatch-accounts",
      200,
      totalDuration,
      req.user.id,
    );

    res.status(200).json({
      success: true,
      data: accountsWithOwnership,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredAccounts.length / limit),
        totalItems: filteredAccounts.length,
        itemsPerPage: limit,
        hasNext: page * limit < filteredAccounts.length,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;
    logger.error(
      `[PERF] Get accounts request failed after ${totalDuration.toFixed(2)}ms`,
      {
        error: error.message,
        stack: error.stack,
        userId: req.user.id,
      },
    );
    // Pass error to centralized error handler
    next(error);
  }
};

exports.updateAccount = [
  // Optional validations for partial update
  body("accountTag")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Account tag must be at least 3 characters")
    .escape(),

  body("accountEmail")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email"),
  // CRITICAL: Do NOT use .normalizeEmail() - we need to preserve exact email format with dots

  // Also support frontend field names
  body("battletag")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Battletag must be at least 3 characters")
    .escape(),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email"),
  // CRITICAL: Do NOT use .normalizeEmail() - we need to preserve exact email format with dots

  body("password")
    .optional()
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .escape(),

  body("accountPassword")
    .optional()
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .escape(),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array(),
      });
    }

    const accountId = req.params.id;

    try {
      // Ensure the account exists and the requester is the owner
      const account = await findOverwatchAccountById(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: [{ msg: "Account not found" }],
        });
      }

      if (account.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: [{ msg: "Not authorized to update this account" }],
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
      if (battletag !== undefined && battletag !== "") {
        updateData.accountTag = battletag;
      }
      if (email !== undefined && email !== "") {
        updateData.accountEmail = email;
        updateData.normalized_account_email = getNormalizedEmail(email);
      }
      if (password !== undefined && password !== "") {
        updateData.accountPassword = password;
      }
      if (googleAccountId !== undefined && googleAccountId !== "") {
        updateData.linked_google_account_id = googleAccountId;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: [{ msg: "No valid fields provided for update" }],
        });
      }

      const updatedAccount = await updateOverwatchAccount(
        accountId,
        updateData,
      );

      // Decrypt accountTag for response
      let decryptedAccountTag = updatedAccount.accounttag;
      try {
        decryptedAccountTag = decrypt(updatedAccount.accounttag);
      } catch (error) {
        // If decryption fails, assume it's already plaintext
        decryptedAccountTag = updatedAccount.accounttag;
      }

      return res.status(200).json({
        success: true,
        data: {
          ...updatedAccount,
          accountTag: decryptedAccountTag,
        },
      });
    } catch (error) {
      next(error);
    }
  },
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
        error: [{ msg: "Account not found" }],
      });
    }

    // Check if the user is the owner of the account
    if (account.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: [{ msg: "Not authorized to update this account" }],
      });
    }

    // Get the list of previously allowed users before making changes
    const { data: oldAllowedUsers, error: fetchOldError } = await supabase
      .from("overwatch_account_allowed_users")
      .select("user_id")
      .eq("overwatch_account_id", accountId);

    if (fetchOldError) {
      logger.error("Error fetching old allowed users:", fetchOldError);
      throw fetchOldError;
    }

    const oldUserIds = oldAllowedUsers
      ? oldAllowedUsers.map((u) => u.user_id)
      : [];

    // Validate that all userIds exist in the users table
    if (userIds && userIds.length > 0) {
      const { data: validUsers, error: validationError } = await supabase
        .from("users")
        .select("id")
        .in("id", userIds);

      if (validationError) {
        throw validationError;
      }

      // Check if all provided userIds are valid
      const validUserIds = validUsers.map((u) => u.id);
      const invalidUserIds = userIds.filter((id) => !validUserIds.includes(id));

      if (invalidUserIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: [
            { msg: `Invalid user IDs provided: ${invalidUserIds.join(", ")}` },
          ],
        });
      }
    }

    // First, remove all existing allowed users with error handling
    const { error: deleteError } = await supabase
      .from("overwatch_account_allowed_users")
      .delete()
      .eq("overwatch_account_id", accountId);

    if (deleteError) {
      logger.error("Error removing existing allowed users:", deleteError);
      throw deleteError;
    }

    // Then, add the new allowed users
    if (userIds && userIds.length > 0) {
      const allowedUsersData = userIds.map((userId) => ({
        overwatch_account_id: accountId,
        user_id: userId,
      }));

      const { error: insertError } = await supabase
        .from("overwatch_account_allowed_users")
        .insert(allowedUsersData);

      if (insertError) {
        logger.error("Error adding new allowed users:", insertError);
        throw insertError;
      }
    }

    // Cache invalidation: Determine all affected users
    const newUserIds = userIds || [];
    const allAffectedUserIds = new Set([
      ...oldUserIds, // Users who lost access
      ...newUserIds, // Users who gained access
    ]);

    // Invalidate cache for the account owner
    const ownerCacheKey = cacheKeys.accounts(account.owner_id);

    // Create cache invalidation promises
    const cacheInvalidationPromises = [
      cache.del(ownerCacheKey), // Invalidate owner's cache
    ];

    // Invalidate cache for all affected users
    for (const userId of allAffectedUserIds) {
      const userCacheKey = cacheKeys.accounts(userId);
      cacheInvalidationPromises.push(cache.del(userCacheKey));
    }

    // Execute all cache invalidations in parallel
    await Promise.all(cacheInvalidationPromises);

    performanceLogger.logCache(
      "invalidate",
      `owner-${account.owner_id}`,
      false,
    );
    logger.debug(`[Cache] Invalidated cache for owner and affected users`, {
      ownerId: account.owner_id,
      affectedUsers: allAffectedUserIds.size,
    });

    // Get updated account with allowed users using LEFT JOIN
    // Using left join ensures we get the account even if there are no allowed users
    const { data: updatedAccount, error: fetchError } = await supabase
      .from("overwatch_accounts")
      .select(
        `
        *,
        overwatch_account_allowed_users(user_id)
      `,
      )
      .eq("id", accountId)
      .single();

    if (fetchError) {
      logger.error("Error fetching updated account:", fetchError);
      throw fetchError;
    }

    // Format the response to include shared users list
    const sharedUserIds = updatedAccount.overwatch_account_allowed_users
      ? updatedAccount.overwatch_account_allowed_users.map((u) => u.user_id)
      : [];

    // Decrypt accountTag for response
    let decryptedAccountTag = updatedAccount.accounttag;
    try {
      decryptedAccountTag = decrypt(updatedAccount.accounttag);
    } catch (error) {
      // If decryption fails, assume it's already plaintext
      decryptedAccountTag = updatedAccount.accounttag;
    }

    res.status(200).json({
      success: true,
      data: {
        ...updatedAccount,
        accountTag: decryptedAccountTag,
        sharedUsers: sharedUserIds,
        // Remove the raw overwatch_account_allowed_users from response
        overwatch_account_allowed_users: undefined,
      },
    });
  } catch (error) {
    logger.error("Error in updateAccountAccess:", error);
    // Pass error to centralized error handler
    next(error);
  }
};

exports.getUsersForSharing = async (req, res, next) => {
  try {
    // Get all users except the current user
    const { data: users, error } = await supabase
      .from("users")
      .select("username, email, id")
      .neq("id", req.user.id);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: users,
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
        error: [{ msg: "Account not found" }],
      });
    }

    // Check if the user is the owner of the account
    if (account.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: [{ msg: "Not authorized to delete this account" }],
      });
    }

    await deleteOverwatchAccount(req.params.id);

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    // Pass error to centralized error handler
    next(error);
  }
};

/**
 * CRITICAL SECURITY ENDPOINT: Get account credentials with authorization checks
 * Returns real credentials for authorized users, cipher text for unauthorized
 */
exports.getAccountCredentials = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const userId = req.user?.id;

    securityLogger.logSuspiciousActivity(
      userId || "anonymous",
      "Credential access attempt",
      {
        accountId,
        timestamp: new Date().toISOString(),
      },
    );

    // Fetch the account
    const account = await findOverwatchAccountById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
      });
    }

    // Critical authorization checks
    const isOwner = userId && account.owner_id === userId;
    let hasSharedAccess = false;

    if (!isOwner && userId) {
      // Check if user has shared access
      const { data: allowedUser } = await supabase
        .from("overwatch_account_allowed_users")
        .select("*")
        .eq("overwatch_account_id", accountId)
        .eq("user_id", userId)
        .single();

      hasSharedAccess = !!allowedUser;
    }

    const hasAccess = isOwner || hasSharedAccess;

    // Log access attempt for security audit
    logger.info("[SECURITY AUDIT] Credential access", {
      accountId,
      userId,
      isOwner,
      hasSharedAccess,
      hasAccess,
    });

    if (!hasAccess) {
      // Return cyberpunk cipher text for unauthorized users
      // Decrypt accountTag for unauthorized users too (it's not sensitive data)
      let decryptedAccountTag = account.accounttag;
      try {
        decryptedAccountTag = decrypt(account.accounttag);
      } catch (error) {
        // If decryption fails, assume it's already plaintext
        decryptedAccountTag = account.accounttag;
      }

      return res.status(200).json({
        success: true,
        data: {
          accountTag: decryptedAccountTag,
          accountEmail: generateCipherText("email"),
          accountPassword: generateCipherText("password"),
          otp: generateCipherText("otp"),
          hasAccess: false,
          accessType: "none",
        },
      });
    }

    // Authorized user - decrypt the password
    let decryptedPassword;

    if (account.password_encryption_type === "aes") {
      try {
        decryptedPassword = decrypt(account.accountpassword);
      } catch (error) {
        logger.error("[SECURITY] Failed to decrypt AES password", {
          error: error.message,
          accountId,
        });
        decryptedPassword = "[Decryption Failed]";
      }
    } else {
      // Legacy bcrypt password - cannot decrypt
      decryptedPassword = "[Legacy Password - Update Required]";
    }

    // Decrypt accountTag for authorized users
    let decryptedAccountTag = account.accounttag;
    try {
      decryptedAccountTag = decrypt(account.accounttag);
    } catch (error) {
      // If decryption fails, assume it's already plaintext
      decryptedAccountTag = account.accounttag;
    }

    // Return real credentials for authorized users
    res.status(200).json({
      success: true,
      data: {
        accountTag: decryptedAccountTag,
        accountEmail: account.accountemail,
        accountPassword: decryptedPassword,
        otp: account.otp || "--:--:--",
        hasAccess: true,
        accessType: isOwner ? "owner" : "shared",
      },
    });
  } catch (error) {
    logger.error("[SECURITY] Error in getAccountCredentials", {
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

/**
 * Helper function to generate cyberpunk-style cipher text
 */
function generateCipherText(type) {
  const glitchChars = "░▒▓█▌│║▐►◄↕↔";
  const hexChars = "0123456789ABCDEF";

  const generateHex = (length) => {
    return [...Array(length)]
      .map(() => hexChars[Math.floor(Math.random() * hexChars.length)])
      .join("");
  };

  const generateGlitch = (length) => {
    return [...Array(length)]
      .map(() => glitchChars[Math.floor(Math.random() * glitchChars.length)])
      .join("");
  };

  const cipherPatterns = {
    email: `ENCRYPTED::${generateHex(16)}::${generateGlitch(4)}`,
    password: `CIPHER::LOCKED::${generateHex(8)}::ACCESS_DENIED`,
    otp: `${generateGlitch(3)}::RESTRICTED::${Date.now()
      .toString(16)
      .toUpperCase()}`,
  };

  return cipherPatterns[type] || `ENCRYPTED::${generateHex(12)}`;
}

/**
 * Share an account with another user by email
 * Non-admin endpoint for account owners to share their accounts
 */
exports.shareAccountByEmail = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { email } = req.body;
    const requesterId = req.user.id;

    // Validate email is provided
    if (!email) {
      return res.status(400).json({
        success: false,
        error: [{ msg: "Email is required" }],
      });
    }

    // Find the user by email
    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("email", email)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({
        success: false,
        error: [{ msg: "User with this email not found" }],
      });
    }

    // Find the account
    const account = await findOverwatchAccountById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: [{ msg: "Account not found" }],
      });
    }

    // Verify that the requester is the owner of the account OR an admin
    const isAdmin = req.user.role === "admin" || req.user.isadmin === true;

    if (account.owner_id !== requesterId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: [
          {
            msg: "You are not authorized to share this account. Only the owner or an admin can share.",
          },
        ],
      });
    }

    // Check if the account is already shared with this user
    const { data: existingShare, error: checkError } = await supabase
      .from("overwatch_account_allowed_users")
      .select("*")
      .eq("overwatch_account_id", accountId)
      .eq("user_id", targetUser.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is the error code for "no rows found" which is expected
      logger.error("Error checking existing share:", checkError);
      throw checkError;
    }

    if (existingShare) {
      return res.status(400).json({
        success: false,
        error: [{ msg: "This account is already shared with this user" }],
      });
    }

    // Insert new share record into junction table
    const { error: insertError } = await supabase
      .from("overwatch_account_allowed_users")
      .insert({
        overwatch_account_id: accountId,
        user_id: targetUser.id,
      });

    if (insertError) {
      logger.error("Error sharing account:", insertError);
      throw insertError;
    }

    // Invalidate cache for both the account owner and the newly shared user
    const ownerCacheKey = cacheKeys.accounts(account.owner_id);
    const userCacheKey = cacheKeys.accounts(targetUser.id);

    await Promise.all([cache.del(ownerCacheKey), cache.del(userCacheKey)]);

    performanceLogger.logCache("invalidate", ownerCacheKey, false);
    logger.debug("[Cache] Invalidated cache for share operation", {
      ownerId: account.owner_id,
      sharedUserId: targetUser.id,
    });

    // Return success message with user info
    res.status(200).json({
      success: true,
      message: `Account successfully shared with ${targetUser.username}`,
      data: {
        accountId: accountId,
        sharedWith: {
          id: targetUser.id,
          username: targetUser.username,
          email: targetUser.email,
        },
      },
    });
  } catch (error) {
    logger.error("Error in shareAccountByEmail:", error);
    next(error);
  }
};

/**
 * Get all accounts with conditional credential display
 * Shows cipher text for accounts user doesn't have access to
 */
exports.getAllAccountsWithConditionalCredentials = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // Get all accounts with owner information
    const { data: accounts, error } = await supabase.from("overwatch_accounts")
      .select(`
        *,
        owner:users!owner_id(id, username)
      `);

    if (error) throw error;

    // Process each account to determine access level
    const processedAccounts = await Promise.all(
      accounts.map(async (account) => {
        const isOwner = userId && account.owner_id === userId;

        // Check shared access
        let hasSharedAccess = false;
        if (!isOwner && userId) {
          const { data: allowedUser } = await supabase
            .from("overwatch_account_allowed_users")
            .select("*")
            .eq("overwatch_account_id", account.id)
            .eq("user_id", userId)
            .single();

          hasSharedAccess = !!allowedUser;
        }

        const hasAccess = isOwner || hasSharedAccess;

        // Decrypt accountTag
        let decryptedAccountTag = account.accounttag;
        try {
          decryptedAccountTag = decrypt(account.accounttag);
        } catch (error) {
          // If decryption fails, assume it's already plaintext
          decryptedAccountTag = account.accounttag;
        }

        // Prepare response based on access level
        const responseData = {
          id: account.id,
          accountTag: decryptedAccountTag,
          rank: account.rank,
          mainHeroes: account.mainheroes,
          owner: account.owner,
          hasAccess: hasAccess,
          accessType: isOwner ? "owner" : hasSharedAccess ? "shared" : "none",
        };

        if (hasAccess) {
          // Show real credentials for authorized users
          let decryptedPassword = account.accountpassword;
          if (account.password_encryption_type === "aes") {
            try {
              decryptedPassword = decrypt(account.accountpassword);
            } catch (error) {
              decryptedPassword = "[Decryption Error]";
            }
          } else {
            decryptedPassword = "[Legacy - Update Required]";
          }

          responseData.accountEmail = account.accountemail;
          responseData.accountPassword = decryptedPassword;
          responseData.otp = account.otp || "--:--:--";
        } else {
          // Show cipher text for unauthorized users
          responseData.accountEmail = generateCipherText("email");
          responseData.accountPassword = generateCipherText("password");
          responseData.otp = generateCipherText("otp");
        }

        return responseData;
      }),
    );

    res.status(200).json({
      success: true,
      data: processedAccounts,
    });
  } catch (error) {
    next(error);
  }
};
