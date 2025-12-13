/**
 * Field Name Normalizer
 *
 * This utility provides consistent field name mapping between:
 * - Frontend (camelCase): battletag, email, password
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
export const FRONTEND_TO_BACKEND_MAP: Record<string, string> = {
  // Account fields - legacy and current
  battletag: 'accountTag',
  battleTag: 'accountTag',
  battle_tag: 'accountTag',
  accounttag: 'accountTag',

  email: 'accountEmail',
  account_email: 'accountEmail',
  accountemail: 'accountEmail',

  password: 'accountPassword',
  account_password: 'accountPassword',
  accountpassword: 'accountPassword',

  // User fields
  is_admin: 'isAdmin',
  isadmin: 'isAdmin',

  is_approved: 'isApproved',
  isapproved: 'isApproved',

  created_at: 'createdAt',
  createdat: 'createdAt',

  updated_at: 'updatedAt',
  updatedat: 'updatedAt',

  owner_id: 'ownerId',
  ownerid: 'ownerId',
};

/**
 * Maps backend field names to database column names (all lowercase)
 */
export const BACKEND_TO_DB_MAP: Record<string, string> = {
  accountTag: 'accounttag',
  accountEmail: 'accountemail',
  accountPassword: 'accountpassword',
  isAdmin: 'isadmin',
  isApproved: 'isapproved',
  createdAt: 'createdat',
  updatedAt: 'updatedat',
  ownerId: 'owner_id',
  passwordHash: 'password_hash',
  linkedGoogleAccountId: 'linked_google_account_id',
  normalizedAccountEmail: 'normalized_account_email',
  passwordEncryptionType: 'password_encryption_type',
  otpFetchedAt: 'otp_fetched_at',
  otpExpiresAt: 'otp_expires_at',
};

type AnyObject = Record<string, unknown>;

/**
 * Normalize request body fields from frontend format to backend format
 * @param body - Request body from frontend
 * @returns Normalized body with standard field names
 */
export function normalizeRequestBody<T extends AnyObject>(body: T): AnyObject {
  if (!body || typeof body !== 'object') return body;

  const normalized: AnyObject = {};

  for (const [key, value] of Object.entries(body)) {
    // Check if this key needs normalization
    const normalizedKey = FRONTEND_TO_BACKEND_MAP[key] || key;

    // Handle nested objects recursively
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      normalized[normalizedKey] = normalizeRequestBody(value as AnyObject);
    } else {
      normalized[normalizedKey] = value;
    }
  }

  return normalized;
}

/**
 * Convert backend field names to database column names
 * @param data - Data with backend field names
 * @returns Data with database column names
 */
export function toDbColumns<T extends AnyObject>(data: T): AnyObject {
  if (!data || typeof data !== 'object') return data;

  const converted: AnyObject = {};

  for (const [key, value] of Object.entries(data)) {
    const dbKey = BACKEND_TO_DB_MAP[key] || key;
    converted[dbKey] = value;
  }

  return converted;
}

/**
 * Convert database row to backend format (camelCase)
 * @param row - Database row with lowercase column names
 * @returns Object with camelCase field names
 */
export function fromDbRow<T extends AnyObject>(row: T): AnyObject {
  if (!row || typeof row !== 'object') return row;

  // Create reverse mapping
  const DB_TO_BACKEND_MAP: Record<string, string> = {};
  for (const [backend, db] of Object.entries(BACKEND_TO_DB_MAP)) {
    DB_TO_BACKEND_MAP[db] = backend;
  }

  const converted: AnyObject = {};

  for (const [key, value] of Object.entries(row)) {
    const backendKey = DB_TO_BACKEND_MAP[key] || key;
    converted[backendKey] = value;
  }

  return converted;
}

/**
 * Extracted account fields with standard names
 */
export interface ExtractedAccountFields {
  accountTag: string | undefined;
  accountEmail: string | undefined;
  accountPassword: string | undefined;
  _originalFields: {
    hadBattletag: boolean;
    hadEmail: boolean;
    hadPassword: boolean;
  };
}

/**
 * Extract account fields from request body with legacy support
 * @param body - Request body
 * @returns Extracted account fields with standard names
 */
export function extractAccountFields(body: AnyObject): ExtractedAccountFields {
  const normalized = normalizeRequestBody(body);

  return {
    accountTag: normalized.accountTag as string | undefined,
    accountEmail: normalized.accountEmail as string | undefined,
    accountPassword: normalized.accountPassword as string | undefined,
    // Include original fields if needed for backward compat
    _originalFields: {
      hadBattletag:
        body.battletag !== undefined || body.battleTag !== undefined,
      hadEmail: body.email !== undefined,
      hadPassword: body.password !== undefined,
    },
  };
}

// CommonJS export for JavaScript files that import this
module.exports = {
  normalizeRequestBody,
  toDbColumns,
  fromDbRow,
  extractAccountFields,
  FRONTEND_TO_BACKEND_MAP,
  BACKEND_TO_DB_MAP,
};
