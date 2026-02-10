/**
 * API Utility for CSRF-Protected Requests
 *
 * This module provides a wrapper around fetch that automatically handles
 * CSRF token management using the double-submit cookie pattern.
 *
 * The backend sets a CSRF token in an httpOnly cookie on GET requests.
 * For state-changing requests (POST, PUT, DELETE, PATCH), we need to:
 * 1. Read the CSRF token from the cookie
 * 2. Add it to the request header
 *
 * Usage:
 *   import { apiRequest } from '@/lib/api';
 *
 *   // GET request (no CSRF token needed)
 *   const data = await apiRequest('/api/dashboard');
 *
 *   // POST request (CSRF token automatically added)
 *   const result = await apiRequest('/api/overwatch-accounts', {
 *     method: 'POST',
 *     body: JSON.stringify({ ... })
 *   });
 */

// Validate NEXT_PUBLIC_API_BASE_URL is set
if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL environment variable is required but not set",
  );
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_STORAGE_KEY = "auth_token";
const TOKEN_EXPIRY_STORAGE_KEY = "auth_token_expires_at";
const SESSION_STORAGE_KEYS = [
  TOKEN_STORAGE_KEY,
  TOKEN_EXPIRY_STORAGE_KEY,
  "user_role",
  "is_admin",
  "username",
  "user",
] as const;

export interface AuthSession {
  token: string | null;
  expired: boolean;
  user: any | null;
  isAdmin: boolean;
}

/**
 * Get the stored authentication session
 */
export function getStoredAuthSession(): AuthSession {
  if (typeof localStorage === "undefined") {
    return { token: null, expired: false, user: null, isAdmin: false };
  }

  let token: string | null = null;
  let expired = false;
  let user: any | null = null;
  let isAdmin = false;

  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return { token: null, expired: false, user: null, isAdmin: false };
    }

    const expiry = parseExpiry(localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY));

    if (!expiry) {
      // If no expiry, assume valid for now but incomplete session
      // Try to get user data anyway
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          // invalid user json
        }
      }

      const role = localStorage.getItem("user_role");
      const isAdminStr = localStorage.getItem("is_admin");
      isAdmin = role === "admin" || isAdminStr === "true";

      return { token, expired: false, user, isAdmin };
    }

    if (Date.now() >= expiry) {
      expired = true;
      clearStoredAuthSession();
      token = null;
    } else {
      // Token valid, get user data
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          // invalid user json
        }
      }

      const role = localStorage.getItem("user_role");
      const isAdminStr = localStorage.getItem("is_admin");
      isAdmin = role === "admin" || isAdminStr === "true";

      // Enhance user object with role if missing but present in separate key
      if (user && !user.role && role) {
        user.role = role;
      }
    }
  } catch {
    clearStoredAuthSession();
    token = null;
    expired = true;
  }

  return { token, expired, user, isAdmin };
}
