/**
 * Database Model Types
 * Type definitions for Supabase database models
 */

/**
 * User database row
 */
export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  isadmin: boolean;
  isapproved: boolean;
  googleid: string | null;
  createdat: string;
  updatedat: string;
}

/**
 * User with methods (as returned by User model)
 */
export interface UserWithMethods extends UserRow {
  _id: string;
  password?: string;
  isAdmin: boolean;
  isApproved: boolean;
  matchPassword: (password: string) => Promise<boolean>;
}

/**
 * Overwatch Account database row
 */
export interface OverwatchAccountRow {
  id: string;
  accounttag: string;
  accountemail: string;
  accountpassword: string;
  owner_id: string;
  normalized_account_email: string;
  password_encryption_type: 'aes' | 'bcrypt';
  linked_google_account_id: string | null;
  otp: string | null;
  otp_fetched_at: string | null;
  otp_expires_at: string | null;
  createdat: string;
  updatedat: string;
}

/**
 * Overwatch Account (camelCase version)
 */
export interface OverwatchAccount {
  id: string;
  accountTag: string;
  accountEmail: string;
  accountPassword: string;
  ownerId: string;
  normalizedAccountEmail: string;
  passwordEncryptionType: 'aes' | 'bcrypt';
  linkedGoogleAccountId: string | null;
  otp: string | null;
  otpFetchedAt: string | null;
  otpExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Account allowed users join table
 */
export interface OverwatchAccountAllowedUser {
  overwatch_account_id: string;
  user_id: string;
}

/**
 * User Google Account
 */
export interface UserGoogleAccountRow {
  id: string;
  user_id: string;
  email: string;
  refresh_token: string;
  is_active: boolean;
  createdat: string;
  updatedat: string;
}

/**
 * Settings table
 */
export interface SettingsRow {
  id: string;
  key: string;
  value: unknown;
  createdat: string;
  updatedat: string;
}

/**
 * Create account request body (frontend format)
 */
export interface CreateAccountRequest {
  battletag?: string;
  accountTag?: string;
  email?: string;
  accountEmail?: string;
  password?: string;
  accountPassword?: string;
  googleAccountId?: string;
  notes?: string;
}

/**
 * Update account request body
 */
export interface UpdateAccountRequest {
  accountTag?: string;
  accountEmail?: string;
  accountPassword?: string;
  linkedGoogleAccountId?: string | null;
}

/**
 * API Response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | Array<{ msg: string; param?: string }>;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
