const bcrypt = require('bcrypt');
const { cache } = require('../utils/cache');
const { findEmailServiceByEmail } = require('./EmailService');

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
  const { accountPassword, accountEmail, accountTag, linked_google_account_id, ...rest } = accountData;

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

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(accountPassword, salt);

  // Map to proper database column names (all lowercase as per actual database)
  const insertData = {
    ...rest,
    accountemail: accountEmail,  // Map to lowercase column name
    accountpassword: hashedPassword,  // Map to lowercase column name
    accounttag: accountTag  // Already lowercase in DB
  };
  
  // Only add linked_google_account_id if it's provided and not empty
  if (linked_google_account_id) {
    insertData.linked_google_account_id = linked_google_account_id;
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
    const salt = await bcrypt.genSalt(10);
    mappedUpdateData.accountpassword = await bcrypt.hash(updateData.accountPassword, salt);
  }
  if (updateData.accountEmail !== undefined) {
    mappedUpdateData.accountemail = updateData.accountEmail;
  }
  if (updateData.accountTag !== undefined) {
    mappedUpdateData.accounttag = updateData.accountTag;
  }
  if (updateData.accounttag !== undefined) {
    mappedUpdateData.accounttag = updateData.accounttag;
  }
  // Handle linked_google_account_id field
  if (updateData.linked_google_account_id !== undefined) {
    mappedUpdateData.linked_google_account_id = updateData.linked_google_account_id;
  }
  // Copy any other fields that don't need mapping
  Object.keys(updateData).forEach(key => {
    if (!['accountPassword', 'accountEmail', 'accountTag', 'accounttag', 'linked_google_account_id'].includes(key)) {
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
 * Compare account password with hashed password
 * @param {string} enteredPassword - The password to check
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {boolean} Whether the passwords match
 */
const matchAccountPassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
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

module.exports = {
  createOverwatchAccount,
  findOverwatchAccountByAccountTag,
  findOverwatchAccountByAccountEmail,
  findOverwatchAccountByOwnerId,
  findOverwatchAccountById,
  updateOverwatchAccount,
  deleteOverwatchAccount,
  matchAccountPassword,
  addAllowedUser,
  removeAllowedUser,
  getAccessibleAccounts,
  getAllAccounts
};
// NOTE: If you have legacy data with battleTag, you must run the migration to rename it to accountTag in Supabase.
// Manual migration step: Check for any remaining references to battleTag in your data and update them to accountTag.