const User = require("../models/User");
const OverwatchAccount = require("../models/OverwatchAccount");
const Settings = require("../models/Settings");
const { check, validationResult } = require("express-validator");
const { cache, cacheKeys, CACHE_TTL } = require("../utils/cache");
const { decrypt } = require("../utils/encryption");
const { validatePassword } = require("../utils/passwordValidator");
const ApiError = require("../utils/ApiError");
const { ok } = require("../utils/respond");
const {
  logger,
  performanceLogger,
  adminAuditLogger,
} = require("../utils/logger");

// accounttag is AES-256-GCM ciphertext; fall back to the raw value rather than hiding the row.
const decryptTag = (value) => {
  if (!value) return value;
  try {
    return decrypt(value);
  } catch (error) {
    return value;
  }
};

// Admin mutations affect the same per-user caches the account controller maintains.
const invalidateUserCachesFor = (userIds) =>
  Promise.all(
    [...new Set((userIds || []).filter(Boolean))].flatMap((id) => [
      cache.del(cacheKeys.accounts(id)),
      cache.del(cacheKeys.dashboard(id)),
    ]),
  );

// Validation failures are thrown, never returned: errorMiddleware owns the shape.
const failValidation = (req) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  const details = {};
  for (const error of errors.array()) details[error.path] = error.msg;
  return new ApiError(400, "VALIDATION_FAILED", "Validation failed", details);
};

// PostgREST filters interpolate this value, so anything outside the allowlist is rejected.
const sanitizeSearchTerm = (value) => {
  const term = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9 _.\-@]{2,64}$/.test(term)) {
    throw new ApiError(400, "VALIDATION_FAILED", "Invalid search query");
  }
  return term.replace(/[,()]/g, "");
};

// @desc    Get all users (listUsers)
// @route   GET /api/admin/users
// @access  Admin
const listUsers = async (req, res, next) => {
  try {
    const supabase = global.supabase;

    // Get all users with account count using join
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(
        "id, username, email, isadmin, isapproved, createdat, updatedat, overwatch_accounts(count)",
      );

    if (usersError) {
      logger.error("Error fetching users:", usersError);
      throw usersError;
    }

    if (process.env.NODE_ENV !== "production") {
      logger.debug(
        "[DEBUG] Raw users data from Supabase:",
        JSON.stringify(users.slice(0, 2), null, 2),
      );
    }

    // Format users for frontend
    const formattedUsers = users.map((user) => ({
      ...User.toPublic(user),
      _id: user.id,
      isadmin: user.isadmin || false,
      isapproved: user.isapproved !== false,
      createdat: user.createdat || null,
      joinDate: user.createdat
        ? new Date(user.createdat).toLocaleDateString()
        : "N/A",
      accountsOwned: user.overwatch_accounts?.[0]?.count || 0,
      status: user.isapproved ? "active" : "suspended",
      lastLogin: user.updatedat
        ? new Date(user.updatedat).toLocaleDateString()
        : "Never",
    }));

    return ok(res, {
      users: formattedUsers,
      totalPages: 1,
    });
  } catch (error) {
    logger.error("Error in listUsers:", error);
    next(error);
  }
};

// Keep the old function name for backward compatibility
const getUsers = listUsers;

// Validation chain for updateUserStatus
const updateUserStatusValidation = [
  check("status")
    .notEmpty()
    .withMessage("Status field is required")
    .isString()
    .withMessage("Status must be a string")
    .isIn(["active", "suspended", "pending"])
    .withMessage("Status must be one of: active, suspended, pending"),
];

// Validation chain for updateUserRole
const updateUserRoleValidation = [
  check("role")
    .notEmpty()
    .withMessage("Role field is required")
    .isString()
    .withMessage("Role must be a string")
    .isIn(["user", "admin"])
    .withMessage('Role must be either "user" or "admin"'),
];

// @desc    Update a user's status
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const invalid = failValidation(req);
    if (invalid) throw invalid;

    const { status } = req.body;

    const user = await User.findById(req.params.id, "-password");

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    // Prevent admin from suspending themselves
    if (
      (user.id || user._id).toString() === req.user.id &&
      (status === "suspended" || status === "pending")
    ) {
      throw new ApiError(
        400,
        "VALIDATION_FAILED",
        "Cannot suspend or set your own account to pending",
      );
    }

    // Map status string to isApproved boolean and update in database
    const supabase = global.supabase;
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ isapproved: status === "active" })
      .eq("id", req.params.id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating user status:", updateError);
      throw updateError;
    }

    // Update the user object with the new data
    Object.assign(user, updatedUser);

    // A suspension must take effect immediately: drop the user's live sockets, or an open
    // tab keeps receiving OTP pushes until the token expires.
    if (status !== "active") {
      const io = req.app.get("io");
      if (io) {
        const sockets = await io.fetchSockets();
        for (const socket of sockets) {
          const socketUser = socket.data && socket.data.user;
          if (socketUser && socketUser.id === req.params.id) {
            socket.disconnect(true);
          }
        }
      }
      await invalidateUserCachesFor([req.params.id]);
    }

    // Return formatted user data
    const { count: accountCount, error: countError } = await supabase
      .from("overwatch_accounts")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id || user._id);

    if (countError) {
      logger.error("Error counting user accounts:", countError);
    }

    const formattedUser = {
      ...User.toPublic(user),
      _id: user.id || user._id,
      status: (
        user.isapproved !== undefined ? user.isapproved : user.isApproved
      )
        ? "active"
        : "suspended",
      joinDate:
        user.createdat || user.createdAt
          ? new Date(user.createdat || user.createdAt).toLocaleDateString()
          : "N/A",
      accountsOwned: accountCount || 0,
      lastLogin:
        user.updatedat || user.updatedAt
          ? new Date(user.updatedat || user.updatedAt).toLocaleDateString()
          : "Never",
    };

    // Audit log the status change
    const oldStatus = (
      user.isapproved !== undefined ? user.isapproved : user.isApproved
    )
      ? "active"
      : "suspended";
    adminAuditLogger.logUserStatusChanged(
      req.user.id,
      req.user.username,
      user.id || user._id,
      user.username,
      oldStatus,
      status,
    );

    return ok(res, {
      message: `User status updated to ${status}`,
      user: formattedUser,
    });
  } catch (error) {
    logger.error("Error in updateUserStatus:", error);
    next(error);
  }
};

// @desc    Update a user's role
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
const updateUserRole = async (req, res, next) => {
  try {
    const invalid = failValidation(req);
    if (invalid) throw invalid;

    const { role } = req.body;

    const user = await User.findById(req.params.id, "-password");

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    // Prevent admin from changing their own role
    if ((user.id || user._id).toString() === req.user.id) {
      throw new ApiError(
        400,
        "VALIDATION_FAILED",
        "Cannot change your own role",
      );
    }

    // Map role string to isAdmin boolean and update in database
    const supabase = global.supabase;
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ isadmin: role === "admin" })
      .eq("id", req.params.id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating user role:", updateError);
      throw updateError;
    }

    // Update the user object with the new data
    Object.assign(user, updatedUser);

    // Return formatted user data
    const { count: accountCount, error: countError } = await supabase
      .from("overwatch_accounts")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id || user._id);

    if (countError) {
      logger.error("Error counting user accounts:", countError);
    }

    const formattedUser = {
      ...User.toPublic(user),
      _id: user.id || user._id,
      status: (
        user.isapproved !== undefined ? user.isapproved : user.isApproved
      )
        ? "active"
        : "suspended",
      joinDate:
        user.createdat || user.createdAt
          ? new Date(user.createdat || user.createdAt).toLocaleDateString()
          : "N/A",
      accountsOwned: accountCount || 0,
      lastLogin:
        user.updatedat || user.updatedAt
          ? new Date(user.updatedat || user.updatedAt).toLocaleDateString()
          : "Never",
    };

    // Audit log the role change (important security event)
    const oldRole = user.isadmin || user.isAdmin ? "admin" : "user";
    adminAuditLogger.logUserRoleChanged(
      req.user.id,
      req.user.username,
      user.id || user._id,
      user.username,
      oldRole,
      role,
    );

    return ok(res, {
      message: `User role updated to ${role}`,
      user: formattedUser,
    });
  } catch (error) {
    logger.error("Error in updateUserRole:", error);
    next(error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Admin
const deleteUser = async (req, res, next) => {
  try {
    const userToDelete = await User.findById(req.params.id, "-password");

    if (!userToDelete) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    // Prevent admin from deleting themselves
    if ((userToDelete.id || userToDelete._id).toString() === req.user.id) {
      throw new ApiError(
        400,
        "VALIDATION_FAILED",
        "Cannot delete your own account",
      );
    }

    // Check if this is the last admin (optional safety check)
    if (userToDelete.isadmin || userToDelete.isAdmin) {
      const supabase = global.supabase;
      const { count: adminCount, error: countError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("isadmin", true);

      if (countError) {
        logger.error("Error counting admins:", countError);
        throw countError;
      }

      if (adminCount <= 1) {
        throw new ApiError(
          400,
          "VALIDATION_FAILED",
          "Cannot delete the last admin account",
        );
      }
    }

    // Delete user's overwatch accounts
    const supabase = global.supabase;
    const { data: accountsToDelete, error: fetchError } = await supabase
      .from("overwatch_accounts")
      .select("id")
      .eq("owner_id", req.params.id);

    if (fetchError) {
      logger.error("Error fetching accounts to delete:", fetchError);
      throw fetchError;
    }

    const accountsDeleted = accountsToDelete ? accountsToDelete.length : 0;

    // 1. Delete all shared access records where this user is the recipient
    const { error: deleteRecipientError } = await supabase
      .from("overwatch_account_allowed_users")
      .delete()
      .eq("user_id", req.params.id);

    if (deleteRecipientError) {
      logger.error(
        "Error deleting shared access records (recipient):",
        deleteRecipientError,
      );
      throw deleteRecipientError;
    }

    // 2. Delete all shared access records for accounts owned by this user
    if (accountsDeleted > 0) {
      const accountIds = accountsToDelete.map((a) => a.id);
      const { error: deleteSharesError } = await supabase
        .from("overwatch_account_allowed_users")
        .delete()
        .in("overwatch_account_id", accountIds);

      if (deleteSharesError) {
        logger.error(
          "Error deleting shared access records (accounts):",
          deleteSharesError,
        );
        throw deleteSharesError;
      }

      // 3. Delete user's overwatch accounts
      const { error: deleteAccountsError } = await supabase
        .from("overwatch_accounts")
        .delete()
        .eq("owner_id", req.params.id);

      if (deleteAccountsError) {
        logger.error("Error deleting accounts:", deleteAccountsError);
        throw deleteAccountsError;
      }
    }

    // 4. Delete the user
    const { error: deleteUserError } = await supabase
      .from("users")
      .delete()
      .eq("id", req.params.id);

    if (deleteUserError) {
      logger.error("Error deleting user:", deleteUserError);
      throw deleteUserError;
    }

    await invalidateUserCachesFor([req.params.id]);

    // Audit log the user deletion (critical security event)
    adminAuditLogger.logUserDeleted(
      req.user.id,
      req.user.username,
      userToDelete.id || userToDelete._id,
      userToDelete.username,
    );

    return ok(res, {
      message: "User deleted successfully",
      deletedUser: {
        ...User.toPublic(userToDelete),
        accountsDeleted,
      },
    });
  } catch (error) {
    logger.error("Error in deleteUser:", error);
    next(error);
  }
};

// @desc    Get recent system-wide activity logs
// @route   GET /api/admin/logs
// @access  Admin
const getLogs = async (req, res, next) => {
  try {
    const supabase = global.supabase;
    // The complete trail is the default: credential reveals are persisted precisely so they
    // can be read here. ?action=<name> narrows the view when one event type is what you want.
    const action = typeof req.query.action === "string" && req.query.action ? req.query.action : null;
    let query = supabase
      .from("admin_audit_logs")
      .select("*")
      .order("createdat", { ascending: false })
      .limit(50);
    if (action) query = query.eq("action", action);

    const { data: logs, error } = await query;

    if (error) throw error;
    return ok(res, logs || []);
  } catch (error) {
    logger.error("Error in getLogs:", error);
    next(error);
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const supabase = global.supabase;

    // Get total users count
    const { count: totalUsers, error: usersCountError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (usersCountError) {
      logger.error("Error counting users:", usersCountError);
      throw usersCountError;
    }

    // Get total accounts count
    const { count: totalAccounts, error: accountsCountError } = await supabase
      .from("overwatch_accounts")
      .select("*", { count: "exact", head: true });

    if (accountsCountError) {
      logger.error("Error counting accounts:", accountsCountError);
      throw accountsCountError;
    }

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username, email, isadmin, isapproved, createdat, updatedat");

    if (usersError) {
      logger.error("Error fetching users:", usersError);
      throw usersError;
    }

    // Get active users count (updated in last 15 minutes)
    const fifteenMinutesAgo = new Date(
      Date.now() - 15 * 60 * 1000,
    ).toISOString();
    const { count: activeUsers, error: activeError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gt("updatedat", fifteenMinutesAgo);

    if (activeError) logger.error("Error counting active users:", activeError);

    // Get shared credentials count
    const { count: sharedCredentials, error: sharedError } = await supabase
      .from("overwatch_account_allowed_users")
      .select("*", { count: "exact", head: true });

    if (sharedError)
      logger.error("Error counting shared credentials:", sharedError);

    // Flagged activity = admin overrides in the last 24 h. The previous query matched
    // '%FAILED%' against action, but no persisted action carries that token, so the tile
    // was structurally unable to leave zero. Deliberately not credential_reveal: owners
    // revealing their own password is ordinary use and would light the card permanently.
    const flaggedSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: flaggedActivities, error: flaggedError } = await supabase
      .from("admin_audit_logs")
      .select("*", { count: "exact", head: true })
      .in("action", [
        "admin_user_deleted",
        "admin_user_role_changed",
        "admin_user_status_changed",
        "force_logout",
      ])
      .gte("createdat", flaggedSince);

    if (flaggedError)
      logger.error("Error counting flagged activities:", flaggedError);

    const systemHealth = "healthy"; // Default to healthy

    // Get recent logs
    const { data: logs, error: logsError } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("createdat", { ascending: false })
      .limit(10);

    if (logsError) logger.error("Error fetching admin logs:", logsError);

    return ok(res, {
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers,
        totalCredentials: totalAccounts || 0, // Map totalAccounts to totalCredentials
        sharedCredentials,
        flaggedActivities,
        systemHealth,
      },
      users: (users || []).map((user) => User.toPublic(user)),
      logs,
    });
  } catch (error) {
    logger.error("Error in getAdminDashboard:", error);
    next(error);
  }
};

// @desc    Get current registration status
// @route   GET /api/admin/registration-status
// @access  Admin
const getRegistrationStatus = async (req, res, next) => {
  try {
    // A missing row means registration is open, matching the auth middleware's `!== false` rule.
    const enabled =
      (await Settings.getSetting("allow_registration")) !== false;
    return ok(res, { enabled });
  } catch (error) {
    logger.error("Error in getRegistrationStatus:", error);
    next(error);
  }
};

// @desc    Toggle user registrations on/off
// @route   POST /api/admin/toggle-registrations
// @access  Admin
const toggleRegistrations = async (req, res, next) => {
  try {
    const { enabled } = req.body || {};

    if (typeof enabled !== "boolean") {
      throw new ApiError(400, "VALIDATION_FAILED", "enabled must be a boolean", {
        enabled: "must be a boolean",
      });
    }

    // Update or create the setting using the helper method that handles upsert
    await Settings.updateSetting("allow_registration", enabled);

    // Audit log the registration toggle
    adminAuditLogger.logRegistrationToggled(
      req.user.id,
      req.user.username,
      enabled,
    );

    return ok(res, { enabled });
  } catch (error) {
    logger.error("Error in toggleRegistrations:", error);
    next(error);
  }
};

// @desc    Create a new user
// @route   POST /api/admin/users
// @access  Admin
const createUser = async (req, res, next) => {
  try {
    const { username, email: rawEmail, password, role = "user" } = req.body || {};
    // Same canonical form registration stores (normalizeEmail lowercases): sharing looks
    // users up case-insensitively, and a mixed-case row is otherwise easy to miss.
    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : rawEmail;

    // Validation
    if (!username || !email || !password) {
      throw new ApiError(
        400,
        "VALIDATION_FAILED",
        "Username, email, and password are required",
      );
    }

    // Validate role
    const validRoles = ["user", "admin"];
    const normalizedRole = role.toLowerCase();
    if (!validRoles.includes(normalizedRole)) {
      throw new ApiError(
        400,
        "VALIDATION_FAILED",
        'Role must be either "user" or "admin"',
      );
    }

    // Validate like the public register route does (this endpoint is admin-only but the
    // stored values must satisfy the same invariants).
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passwordCheck = validatePassword(password);
    if (!emailValid) {
      throw new ApiError(400, "VALIDATION_FAILED", "Please provide a valid email", {
        email: "Please provide a valid email",
      });
    }
    if (!passwordCheck.isValid) {
      throw new ApiError(400, "VALIDATION_FAILED", "Password does not meet the policy", {
        password: passwordCheck.errors.join(", "),
      });
    }

    // Uniqueness probe: two parameterised lookups. Values are never interpolated into a
    // PostgREST filter expression (an email may contain "+", a comma, or be long).
    const supabase = global.supabase;

    const { data: emailHit, error: emailError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (emailError && emailError.code !== "PGRST116") {
      logger.error("Error checking existing email:", emailError);
      throw emailError;
    }
    if (emailHit) {
      throw new ApiError(409, "CONFLICT", "User with this email already exists");
    }

    const { data: usernameHit, error: usernameError } = await supabase
      .from("users")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (usernameError && usernameError.code !== "PGRST116") {
      logger.error("Error checking existing username:", usernameError);
      throw usernameError;
    }
    if (usernameHit) {
      throw new ApiError(409, "CONFLICT", "User with this username already exists");
    }

    // Create user instance and save (password will be hashed)
    const newUser = new User({
      username,
      email,
      password,
      role: normalizedRole === "admin" ? "Admin" : "User",
      isAdmin: normalizedRole === "admin",
      isApproved: true, // Admin-created users are automatically approved
    });

    const user = await newUser.save();

    // Format user to match frontend expectations
    const formattedUser = {
      ...User.toPublic(user),
      _id: user.id,
      joinDate: user.createdat
        ? new Date(user.createdat).toLocaleDateString()
        : "N/A",
      accountsOwned: 0,
      status: "active", // Admin-created users are active by default
      lastLogin: "Never",
    };

    // Audit log the user creation
    adminAuditLogger.logUserCreated(
      req.user.id,
      req.user.username,
      user.id,
      user.username,
      user.email,
    );

    return ok(
      res,
      {
        message: `User ${username} created successfully`,
        user: formattedUser,
      },
      201,
    );
  } catch (error) {
    logger.error("Error in createUser:", error);
    if (error.code === 11000) {
      return next(
        new ApiError(
          409,
          "CONFLICT",
          "User with this email or username already exists",
        ),
      );
    }
    next(error);
  }
};

// @desc    Export user data (GDPR compliance)
// @route   GET /api/admin/users/:id/export
// @access  Admin
const exportUserData = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const supabase = global.supabase;

    // Fetch user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        "id, username, email, role, isadmin, isapproved, createdat, updatedat",
      )
      .eq("id", targetUserId)
      .single();

    if (userError || !user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    // Fetch user's Overwatch accounts (owned)
    const { data: ownedAccounts, error: accountsError } = await supabase
      .from("overwatch_accounts")
      .select(
        "id, accounttag, accountemail, createdat, updatedat, otp_fetched_at, linked_google_account_id",
      )
      .eq("owner_id", targetUserId);

    if (accountsError) {
      logger.error("Error fetching user accounts for export:", accountsError);
    }

    // Fetch accounts shared with this user
    const { data: sharedAccess, error: sharedError } = await supabase
      .from("overwatch_account_allowed_users")
      .select(
        "overwatch_account_id, overwatch_accounts(id, accounttag, accountemail)",
      )
      .eq("user_id", targetUserId);

    if (sharedError) {
      logger.error("Error fetching shared accounts for export:", sharedError);
    }

    // Fetch user's linked Google accounts
    const { data: googleAccounts, error: googleError } = await supabase
      .from("user_google_accounts")
      .select("id, email, is_active, createdat")
      .eq("user_id", targetUserId);

    if (googleError && googleError.code !== "42P01") {
      // Table might not exist
      logger.error("Error fetching Google accounts for export:", googleError);
    }

    // Build the export data
    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: "GDPR Data Export",
      requestedBy: {
        adminId: req.user.id,
        adminUsername: req.user.username,
      },
      userData: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.isadmin ? "admin" : "user",
        isApproved: user.isapproved,
        createdAt: user.createdat,
        updatedAt: user.updatedat,
      },
      ownedAccounts: (ownedAccounts || []).map((account) => ({
        id: account.id,
        accountTag: decryptTag(account.accounttag),
        accountEmail: account.accountemail,
        createdAt: account.createdat,
        updatedAt: account.updatedat,
        hasLinkedGoogleAccount: !!account.linked_google_account_id,
        lastOtpFetched: account.otp_fetched_at,
      })),
      sharedAccountAccess: (sharedAccess || []).map((access) => ({
        accountId: access.overwatch_account_id,
        accountTag: decryptTag(access.overwatch_accounts?.accounttag),
        accountEmail: access.overwatch_accounts?.accountemail,
      })),
      sharedAccess: (sharedAccess || []).map((share) => ({
        accountId: share.overwatch_account_id,
        accountTag: decryptTag(share.overwatch_accounts?.accounttag) || "Unknown",
        email: share.overwatch_accounts
          ? share.overwatch_accounts.accountemail
          : "Unknown",
      })),
      linkedGoogleAccounts: (googleAccounts || []).map((account) => ({
        id: account.id,
        email: account.email,
        isActive: account.is_active,
        linkedAt: account.createdat,
      })),
      dataRetentionNote:
        "This export contains all personal data stored for this user as per GDPR Article 15.",
    };

    // Audit log the export
    adminAuditLogger.logDataExport(
      req.user.id,
      req.user.username,
      targetUserId,
      user.username,
    );

    // Set content type for download
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="user-data-export-${user.username}-${
        new Date().toISOString().split("T")[0]
      }.json"`,
    );

    return ok(res, exportData);
  } catch (error) {
    logger.error("Error in exportUserData:", error);
    next(error);
  }
};

// @desc    Grant account access to a specific user (Admin override)
// @route   POST /api/admin/share-account
// @access  Admin
const shareAccountAccess = async (req, res, next) => {
  try {
    const { accountId, targetUserId } = req.body || {};

    if (!accountId || !targetUserId) {
      throw new ApiError(
        400,
        "VALIDATION_FAILED",
        "Account ID and Target User ID are required",
      );
    }

    const supabase = global.supabase;

    // Check if account exists
    const { data: account, error: accountError } = await supabase
      .from("overwatch_accounts")
      .select("id, accounttag, owner_id")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      throw new ApiError(404, "NOT_FOUND", "Overwatch account not found");
    }

    // Check if target user exists
    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", targetUserId)
      .single();

    if (userError || !targetUser) {
      throw new ApiError(404, "NOT_FOUND", "Target user not found");
    }

    // Insert into allowed users
    const { error: shareError } = await supabase
      .from("overwatch_account_allowed_users")
      .insert({
        overwatch_account_id: accountId,
        user_id: targetUserId,
      });

    if (shareError) {
      // Check for duplicate key error
      if (shareError.code === "23505") {
        throw new ApiError(
          409,
          "CONFLICT",
          "User already has access to this account",
        );
      }
      logger.error("Error sharing account:", shareError);
      throw shareError;
    }

    // Audit log + response carry the human-readable tag, never the ciphertext.
    const accountTag = decryptTag(account.accounttag);

    await invalidateUserCachesFor([targetUserId, account.owner_id]);

    adminAuditLogger.log("share_account", req.user.id, {
      adminUsername: req.user.username,
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      accountId: account.id,
      accountTag,
    });

    return ok(res, {
      message: `Access to ${accountTag} granted to ${targetUser.username}`,
    });
  } catch (error) {
    logger.error("Error in shareAccountAccess:", error);
    next(error);
  }
};

// @desc    Search accounts or users for admin tools
// @route   GET /api/admin/search
// @access  Admin
const searchAccountsUsers = async (req, res, next) => {
  try {
    const { query, type } = req.query;

    if (!query || query.length < 2) {
      return ok(res, []);
    }

    // Interpolated into the PostgREST `.or()` filters below — anything outside
    // the allowlist is rejected before it reaches the query string.
    const term = sanitizeSearchTerm(query);

    const supabase = global.supabase;
    let results = [];

    if (type === "user") {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, email")
        .or(`username.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;
      results = data.map((u) => ({
        id: u.id,
        label: `${u.username} (${u.email})`,
        value: u.id,
        type: "user",
      }));
    } else if (type === "account") {
      // accounttag is encrypted, so only the plaintext email column can be filtered;
      // the tag is decrypted afterwards for display.
      const { data, error } = await supabase
        .from("overwatch_accounts")
        .select("id, accounttag, accountemail")
        .ilike("accountemail", `%${term}%`)
        .limit(10);

      if (error) throw error;
      results = data.map((a) => ({
        id: a.id,
        label: `${decryptTag(a.accounttag)} (${a.accountemail})`,
        value: a.id,
        type: "account",
      }));
    }

    return ok(res, results);
  } catch (error) {
    logger.error("Error in searchAccountsUsers:", error);
    next(error);
  }
};

// @desc    Force logout all users (except current admin)
// @route   POST /api/admin/force-logout
// @access  Admin
const forceLogoutAll = async (req, res, next) => {
  try {
    const timestamp = Date.now();
    await Settings.updateSetting("min_jwt_issued_at", timestamp);

    // authMiddleware reads this key through a 60 s cache: drop it now, or revoked tokens
    // keep working for the remainder of that window.
    await cache.del("min_jwt_issued_at");

    // Drop live sockets too — they authenticate once, at handshake time.
    const io = req.app.get("io");
    let disconnected = 0;
    if (io) {
      const sockets = await io.fetchSockets();
      for (const socket of sockets) {
        // RemoteSocket exposes only the `data` projection, not custom properties.
        const socketUser = socket.data && socket.data.user;
        if (socketUser && socketUser.id !== req.user.id) {
          socket.disconnect(true);
          disconnected += 1;
        }
      }
    }

    // Audit log
    adminAuditLogger.log("force_logout", req.user.id, {
      adminUsername: req.user.username,
      timestamp,
      socketsDisconnected: disconnected,
    });

    return ok(res, {
      message: "All users have been forced to log out.",
      socketsDisconnected: disconnected,
    });
  } catch (error) {
    logger.error("Error in forceLogoutAll:", error);
    next(error);
  }
};

// @desc    Clear system cache
// @route   POST /api/admin/clear-cache
// @access  Admin
const performSystemMaintenance = async (req, res, next) => {
  try {
    await cache.clear();

    // Audit log
    adminAuditLogger.log("clear_cache", req.user.id, {
      adminUsername: req.user.username,
    });

    return ok(res, { message: "System cache cleared successfully" });
  } catch (error) {
    logger.error("Error in performSystemMaintenance:", error);
    next(error);
  }
};

// @desc    Export all users as CSV
// @route   GET /api/admin/export-users
// @access  Admin
const exportAllUsers = async (req, res, next) => {
  try {
    const supabase = global.supabase;
    const { data: users, error } = await supabase
      .from("users")
      .select(
        "id, username, email, role, isadmin, isapproved, createdat, updatedat",
      );

    if (error) throw error;

    // Convert to CSV
    const fields = [
      "id",
      "username",
      "email",
      "role",
      "status",
      "joined_at",
      "updatedat",
    ];
    const csvRows = [fields.join(",")];

    users.forEach((user) => {
      const status = user.isapproved ? "active" : "suspended";
      const role = user.isadmin ? "admin" : "user";
      const joined = user.createdat
        ? new Date(user.createdat).toISOString()
        : "";
      const lastLogin = user.updatedat
        ? new Date(user.updatedat).toISOString()
        : "";

      const row = [
        user.id,
        `"${user.username}"`,
        `"${user.email}"`,
        role,
        status,
        joined,
        lastLogin,
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");

    res.header("Content-Type", "text/csv");
    res.attachment("users_export.csv");
    return res.send(csvString);
  } catch (error) {
    logger.error("Error in exportAllUsers:", error);
    next(error);
  }
};

module.exports = {
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
};
