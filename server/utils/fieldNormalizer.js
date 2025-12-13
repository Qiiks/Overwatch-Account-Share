/**
 * Field Name Normalizer
 *
 * This utility provides consistent field name mapping between:
 * - Frontend (camelCase): battletag, accountEmail, accountPassword
 * - Backend (camelCase): accountTag, accountEmail, accountPassword
 * - Database (lowercase): accounttag, accountemail, accountpassword
 *
 * This ensures backward compatibility with existing data and APIs
 * while providing a clean interface for new code.
 */

/**
 * Maps frontend field names to backend field names
 * Handles legacy field names for backward compatibility
 */
const FRONTEND_TO_BACKEND_MAP = {
  // Account fields - legacy and current
  battletag: "accountTag",
  battleTag: "accountTag",
  battle_tag: "accountTag",
  accounttag: "accountTag",

  email: "accountEmail",
  account_email: "accountEmail",
  accountemail: "accountEmail",

  password: "accountPassword",
  account_password: "accountPassword",
  accountpassword: "accountPassword",

  // User fields
  is_admin: "isAdmin",
  isadmin: "isAdmin",

  is_approved: "isApproved",
  isapproved: "isApproved",

  created_at: "createdAt",
  createdat: "createdAt",

  updated_at: "updatedAt",
  updatedat: "updatedAt",

  owner_id: "ownerId",
  ownerid: "ownerId",
};

/**
 * Maps backend field names to database column names (all lowercase)
 */
const BACKEND_TO_DB_MAP = {
  accountTag: "accounttag",
  accountEmail: "accountemail",
  accountPassword: "accountpassword",
  isAdmin: "isadmin",
  isApproved: "isapproved",
  createdAt: "createdat",
  updatedAt: "updatedat",
  ownerId: "owner_id",
  passwordHash: "password_hash",
  linkedGoogleAccountId: "linked_google_account_id",
  normalizedAccountEmail: "normalized_account_email",
  passwordEncryptionType: "password_encryption_type",
  otpFetchedAt: "otp_fetched_at",
  otpExpiresAt: "otp_expires_at",
};

/**
 * Normalize request body fields from frontend format to backend format
 * @param {Object} body - Request body from frontend
 * @returns {Object} Normalized body with standard field names
 */
function normalizeRequestBody(body) {
  if (!body || typeof body !== "object") return body;

  const normalized = {};

  for (const [key, value] of Object.entries(body)) {
    // Check if this key needs normalization
    const normalizedKey = FRONTEND_TO_BACKEND_MAP[key] || key;

    // Handle nested objects recursively
    if (value && typeof value === "object" && !Array.isArray(value)) {
      normalized[normalizedKey] = normalizeRequestBody(value);
    } else {
      normalized[normalizedKey] = value;
    }
  }

  return normalized;
}

/**
 * Convert backend field names to database column names
 * @param {Object} data - Data with backend field names
 * @returns {Object} Data with database column names
 */
function toDbColumns(data) {
  if (!data || typeof data !== "object") return data;

  const converted = {};

  for (const [key, value] of Object.entries(data)) {
    const dbKey = BACKEND_TO_DB_MAP[key] || key;
    converted[dbKey] = value;
  }

  return converted;
}

/**
 * Convert database row to backend format (camelCase)
 * @param {Object} row - Database row with lowercase column names
 * @returns {Object} Object with camelCase field names
 */
function fromDbRow(row) {
  if (!row || typeof row !== "object") return row;

  // Create reverse mapping
  const DB_TO_BACKEND_MAP = {};
  for (const [backend, db] of Object.entries(BACKEND_TO_DB_MAP)) {
    DB_TO_BACKEND_MAP[db] = backend;
  }

  const converted = {};

  for (const [key, value] of Object.entries(row)) {
    const backendKey = DB_TO_BACKEND_MAP[key] || key;
    converted[backendKey] = value;
  }

  return converted;
}

/**
 * Extract account fields from request body with legacy support
 * @param {Object} body - Request body
 * @returns {Object} Extracted account fields with standard names
 */
function extractAccountFields(body) {
  const normalized = normalizeRequestBody(body);

  return {
    accountTag: normalized.accountTag,
    accountEmail: normalized.accountEmail,
    accountPassword: normalized.accountPassword,
    // Include original fields if needed for backward compat
    _originalFields: {
      hadBattletag:
        body.battletag !== undefined || body.battleTag !== undefined,
      hadEmail: body.email !== undefined,
      hadPassword: body.password !== undefined,
    },
  };
}

module.exports = {
  normalizeRequestBody,
  toDbColumns,
  fromDbRow,
  extractAccountFields,
  FRONTEND_TO_BACKEND_MAP,
  BACKEND_TO_DB_MAP,
};
