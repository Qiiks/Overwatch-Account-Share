const bcrypt = require('bcrypt');
const { cache } = require('../utils/cache');
const { findEmailServiceByEmail } = require('./EmailService');
const { getNormalizedEmail } = require('../utils/emailNormalizer');
const { encrypt, decrypt } = require('../utils/encryption');

// Get Supabase client from global scope (set in config/db.js)
const getSupabase = () => global.supabase;

/**
 * Create a new Overwatch account
 * @param {Object} accountData - The account data
 * @returns {Object} The created account
 */
const createOverwatchAccount = async (accountData) => {
  // NOTE: accountTag is now used instead of battleTag per new schema.
  // If migrating existing data, ensure all battleTag values are moved to accountTag.
  const {
    accountPassword,
    accountEmail,
    accountTag,
    linked_google_account_id,
    otp,
    otp_fetched_at,
    otp_expires_at,
    ...rest
  } = accountData;

  // Log for debugging
  console.log('Creating Overwatch account with:', {
    accountTag,
    accountEmail,
    linked_google_account_id,
    owner_id: rest.owner_id
  });

  // Email service validation completely bypassed - table doesn't exist
  // const cacheKey = `email-service:${accountEmail}`;
  // let emailService = await cache.get(cacheKey);

  // if (emailService === null) {
  //   // Use the Supabase EmailService model
  //   emailService = await findEmailServiceByEmail(accountEmail);
  //   // Cache for 1 hour
  //   await cache.set(cacheKey, emailService, 3600);
  // }

  // Temporarily bypass email service validation for testing
  // if (!emailService || !emailService.isActive) {
  //   throw new Error('The provided email is not a valid active email service');
  // }

  // Use AES encryption for new passwords (reversible for credential viewing)
  // SECURITY: This allows the "View Credentials" feature to work
  const encryptedPassword = encrypt(accountPassword);
  
  // Encrypt accountTag for security
  const encryptedAccountTag = encrypt(accountTag);

  // Generate normalized email for OTP matching
  const normalizedEmail = getNormalizedEmail(accountEmail);

  // Map to proper database column names (all lowercase as per actual database)
  const insertData = {
    ...rest,
    accountemail: accountEmail,  // Map to lowercase column name
    accountpassword: encryptedPassword,  // Now using AES encryption
    accounttag: encryptedAccountTag,  // Encrypted for security
    normalized_account_email: normalizedEmail,  // New field for OTP matching
    password_encryption_type: 'aes'  // Mark as AES encrypted
  };
  
  // Only add linked_google_account_id if it's provided and not empty
  if (linked_google_account_id) {
    insertData.linked_google_account_id = linked_google_account_id;
  }

  // Add OTP fields if provided
  if (otp !== undefined) {
    insertData.otp = otp;
  }
  if (otp_fetched_at !== undefined) {
    insertData.otp_fetched_at = otp_fetched_at;
  }
  if (otp_expires_at !== undefined) {
    insertData.otp_expires_at = otp_expires_at;
  }

  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .insert([insertData])
    .select();

  if (error) {
    console.error('Error creating Overwatch account:', error);
    throw new Error(error.message);
  }
  
  console.log('Successfully created Overwatch account:', data[0]);
  return data[0];
};

/**
 * Find an Overwatch account by account tag
 * @param {string} accountTag - The account tag to search for
 * @returns {Object|null} The found account or null
 */
const findOverwatchAccountByAccountTag = async (accountTag) => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .select('*')
    .eq('accounttag', accountTag)
    // If this fails, ensure migration from battleTag to accountTag is complete.
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(error.message);
  }
  return data;
};

/**
 * Find an Overwatch account by account email
 * @param {string} accountEmail - The account email to search for
 * @returns {Object|null} The found account or null
 */
const findOverwatchAccountByAccountEmail = async (accountEmail) => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .select('*')
    .eq('accountemail', accountEmail)  // Use lowercase column name
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  return data;
};

/**
 * Find Overwatch accounts by owner ID
 * @param {string} ownerId - The owner ID to search for
 * @returns {Array} The found accounts
 */
const findOverwatchAccountByOwnerId = async (ownerId) => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .select('*')
    .eq('owner_id', ownerId);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

/**
 * Find an Overwatch account by ID
 * @param {string} id - The account ID to search for
 * @returns {Object|null} The found account or null
 */
const findOverwatchAccountById = async (id) => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  return data;
};

/**
 * Update an Overwatch account
 * @param {string} id - The account ID to update
 * @param {Object} updateData - The data to update
 * @returns {Object} The updated account
 */
const updateOverwatchAccount = async (id, updateData) => {
  // Hash password if it's being updated
  const mappedUpdateData = {};
  
  // Map camelCase to lowercase column names
  if (updateData.accountPassword) {
    // Use AES encryption for updated passwords
    mappedUpdateData.accountpassword = encrypt(updateData.accountPassword);
    mappedUpdateData.password_encryption_type = 'aes';
  }
  if (updateData.accountEmail !== undefined) {
    mappedUpdateData.accountemail = updateData.accountEmail;
    // Update normalized email whenever account email is updated
    mappedUpdateData.normalized_account_email = getNormalizedEmail(updateData.accountEmail);
  }
  if (updateData.accountTag !== undefined) {
    // Encrypt accountTag for security
    mappedUpdateData.accounttag = encrypt(updateData.accountTag);
  }
  if (updateData.accounttag !== undefined) {
    mappedUpdateData.accounttag = updateData.accounttag;
  }
  // Handle linked_google_account_id field
  if (updateData.linked_google_account_id !== undefined) {
    mappedUpdateData.linked_google_account_id = updateData.linked_google_account_id;
  }
  // Handle OTP fields
  if (updateData.otp !== undefined) {
    mappedUpdateData.otp = updateData.otp;
  }
  if (updateData.otp_fetched_at !== undefined) {
    mappedUpdateData.otp_fetched_at = updateData.otp_fetched_at;
  }
  if (updateData.otp_expires_at !== undefined) {
    mappedUpdateData.otp_expires_at = updateData.otp_expires_at;
  }
  // Copy any other fields that don't need mapping
  Object.keys(updateData).forEach(key => {
    if (!['accountPassword', 'accountEmail', 'accountTag', 'accounttag', 'linked_google_account_id', 'otp', 'otp_fetched_at', 'otp_expires_at'].includes(key)) {
      mappedUpdateData[key] = updateData[key];
    }
  });

  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .update(mappedUpdateData)
    .eq('id', id)
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return data[0];
};

/**
 * Delete an Overwatch account
 * @param {string} id - The account ID to delete
 * @returns {Object} The deleted account
 */
const deleteOverwatchAccount = async (id) => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

/**
 * Compare account password with stored password (bcrypt or AES)
 * @param {string} enteredPassword - The password to check
 * @param {string} storedPassword - The stored password (hashed or encrypted)
 * @param {string} encryptionType - The encryption type ('bcrypt' or 'aes')
 * @returns {boolean} Whether the passwords match
 */
const matchAccountPassword = async (enteredPassword, storedPassword, encryptionType = 'bcrypt') => {
  if (encryptionType === 'aes') {
    // For AES, decrypt and compare
    try {
      const decryptedPassword = decrypt(storedPassword);
      return decryptedPassword === enteredPassword;
    } catch (error) {
      console.error('Error decrypting password:', error);
      return false;
    }
  } else {
    // For bcrypt, use compare
    return await bcrypt.compare(enteredPassword, storedPassword);
  }
};

/**
 * Get decrypted password for an account (only works with AES encryption)
 * @param {string} accountId - The account ID
 * @returns {string|null} The decrypted password or null if not AES encrypted
 */
const getDecryptedPassword = async (accountId) => {
  const account = await findOverwatchAccountById(accountId);
  if (!account) return null;
  
  if (account.password_encryption_type === 'aes') {
    try {
      return decrypt(account.accountpassword);
    } catch (error) {
      console.error('Error decrypting password:', error);
      return null;
    }
  }
  
  // Cannot decrypt bcrypt passwords
  return null;
};

/**
 * Add a user to the allowed users list for an account
 * @param {string} accountId - The account ID
 * @param {string} userId - The user ID to add
 * @returns {Object} The created allowed user record
 */
const addAllowedUser = async (accountId, userId) => {
  // Insert into the join table
  const { data, error } = await getSupabase()
    .from('overwatch_account_allowed_users')
    .insert([{ overwatch_account_id: accountId, user_id: userId }])
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return data[0];
};

/**
 * Remove a user from the allowed users list for an account
 * @param {string} accountId - The account ID
 * @param {string} userId - The user ID to remove
 * @returns {Object} The deleted allowed user record
 */
const removeAllowedUser = async (accountId, userId) => {
  // Remove from the join table
  const { data, error } = await getSupabase()
    .from('overwatch_account_allowed_users')
    .delete()
    .eq('overwatch_account_id', accountId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

/**
 * Get accounts accessible by a user (owned or shared)
 * @param {string} userId - The user ID
 * @returns {Array} The accessible accounts
 */
const getAccessibleAccounts = async (userId) => {
  // Get owned accounts
  const ownedAccounts = await findOverwatchAccountByOwnerId(userId);

  // Get shared accounts
  const { data: sharedAccountIds, error } = await getSupabase()
    .from('overwatch_account_allowed_users')
    .select('overwatch_account_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  let sharedAccounts = [];
  if (sharedAccountIds.length > 0) {
    const accountIds = sharedAccountIds.map(item => item.overwatch_account_id);
    const { data: accounts, error: sharedError } = await getSupabase()
      .from('overwatch_accounts')
      .select('*')
      .in('id', accountIds);

    if (sharedError) {
      throw new Error(sharedError.message);
    }
    sharedAccounts = accounts;
  }

  return [...ownedAccounts, ...sharedAccounts];
};

/**
 * Get all Overwatch accounts
 * @returns {Array} All accounts
 */
const getAllAccounts = async () => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .select('*');

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
};

/**
 * Update OTP for an Overwatch account
 * @param {string} normalizedEmail - The normalized email to search for
 * @param {string} otp - The OTP code
 * @param {Date} fetchedAt - When the OTP was fetched
 * @param {Date} expiresAt - When the OTP expires
 * @returns {Object} The updated account
 */
const updateAccountOTP = async (normalizedEmail, otp, fetchedAt, expiresAt) => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .update({
      otp: otp,
      otp_fetched_at: fetchedAt,
      otp_expires_at: expiresAt
    })
    .eq('normalized_account_email', normalizedEmail)
    .select();

  if (error) {
    throw new Error(error.message);
  }
  return data[0];
};

/**
 * Find Overwatch accounts by normalized email
 * @param {string} normalizedEmail - The normalized email to search for
 * @returns {Array} The found accounts
 */
const findAccountsByNormalizedEmail = async (normalizedEmail) => {
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .select('*')
    .eq('normalized_account_email', normalizedEmail);

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
};

/**
 * Alias for findOverwatchAccountByAccountEmail for compatibility
 * @param {string} email - The account email to search for
 * @returns {Object|null} The found account or null
 */
const findByEmail = async (email) => {
  return findOverwatchAccountByAccountEmail(email);
};

/**
 * Clear expired OTPs from all accounts
 * @returns {number} The number of accounts cleared
 */
const clearExpiredOTPs = async () => {
  const now = new Date().toISOString();
  
  const { data, error } = await getSupabase()
    .from('overwatch_accounts')
    .update({
      otp: null,
      otp_fetched_at: null,
      otp_expires_at: null
    })
    .lt('otp_expires_at', now)
    .not('otp', 'is', null)
    .select();

  if (error) {
    throw new Error(error.message);
  }
  
  return data ? data.length : 0;
};

module.exports = {
  createOverwatchAccount,
  findOverwatchAccountByAccountTag,
  findOverwatchAccountByAccountEmail,
  findOverwatchAccountByOwnerId,
  findOverwatchAccountById,
  updateOverwatchAccount,
  deleteOverwatchAccount,
  matchAccountPassword,
  getDecryptedPassword,
  addAllowedUser,
  removeAllowedUser,
  getAccessibleAccounts,
  getAllAccounts,
  updateAccountOTP,
  findAccountsByNormalizedEmail,
  findByEmail,
  clearExpiredOTPs
};
// NOTE: If you have legacy data with battleTag, you must run the migration to rename it to accountTag in Supabase.
// Manual migration step: Check for any remaining references to battleTag in your data and update them to accountTag.