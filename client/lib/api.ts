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
  throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is required but not set');
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_STORAGE_KEY = 'auth_token';
const TOKEN_EXPIRY_STORAGE_KEY = 'auth_token_expires_at';
const SESSION_STORAGE_KEYS = [
  TOKEN_STORAGE_KEY,
  TOKEN_EXPIRY_STORAGE_KEY,
  'user_role',
  'is_admin',
  'username',
  'user'
] as const;

export interface AuthSession {
  token: string | null;
  expired: boolean;
}

/**
 * Get a cookie value by name
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    // Server-side rendering - no cookies available
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  
  return null;
}

/**
 * Check if a request method requires CSRF protection
 * @param method - HTTP method
 * @returns true if CSRF protection is required
 */
function requiresCsrfProtection(method: string): boolean {
  const safeMethod = method.toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(safeMethod);
}

/**
 * Make an API request with automatic CSRF token handling
 * 
 * @param endpoint - API endpoint (relative or absolute URL)
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise resolving to the response data
 * @throws Error if the request fails or CSRF token is missing for protected requests
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Build full URL - use Next.js proxy route for all API requests
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : buildProxyUrl(endpoint);

  // Default to GET method
  const method = options.method?.toUpperCase() || 'GET';

  // Start building headers
  const headers = new Headers(options.headers || {});

  // Add Content-Type if not already set and body is present
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Add Authorization header if token exists
  const { token: authToken, expired } = getStoredAuthSession();

  if (expired) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  // Handle CSRF token for state-changing requests
  if (requiresCsrfProtection(method)) {
    let csrfToken = getCookie(CSRF_COOKIE_NAME);
    
    // Lazy initialization: if no token exists, fetch it first
    if (!csrfToken) {
      console.log('[API] CSRF token not found, fetching via /api/health...');
      
      try {
        // Make a GET request to fetch the CSRF token via proxy
        await fetch(buildProxyUrl('/api/health'), {
          credentials: 'include', // Ensure cookies are sent/received
        });
        
        // Try to get the token again after the health check
        csrfToken = getCookie(CSRF_COOKIE_NAME);
        
        if (!csrfToken) {
          console.error('[API] Failed to obtain CSRF token after health check');
          throw new Error('CSRF token could not be obtained. Please refresh the page.');
        }
        
        console.log('[API] CSRF token successfully obtained');
      } catch (error) {
        console.error('[API] Error fetching CSRF token:', error);
        throw new Error('Failed to initialize CSRF protection');
      }
    }
    
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  // Make the request
  try {
    const response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include', // Include cookies in the request
    });

    // Handle HTTP errors
    if (!response.ok) {
      // Try to parse error message from response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData = null;
      
      try {
        errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If response is not JSON, use status text
      }

      // Create an error object that preserves the response data
      const error = new Error(errorMessage);
      (error as any).response = {
        status: response.status,
        data: errorData
      };
      throw error;
    }

    // Parse response
    const contentType = response.headers.get('Content-Type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    // For non-JSON responses, return the text
    return await response.text() as T;
    
  } catch (error) {
    console.error(`[API] Request failed: ${method} ${url}`, error);
    throw error;
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Convenience method for PATCH requests
 */
export async function apiPatch<T = any>(
  endpoint: string,
  data?: any,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

function buildProxyUrl(endpoint: string): string {
  const trimmed = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (trimmed.startsWith('/api/')) {
    return trimmed;
  }
  return `/api${trimmed}`;
}

function parseExpiry(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const numericValue = Number(raw);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const parsedDate = Date.parse(raw);
  return Number.isNaN(parsedDate) ? null : parsedDate;
}

export function clearStoredAuthSession(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  SESSION_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage removal errors (e.g., private mode)
    }
  });
}

export function getStoredAuthSession(): AuthSession {
  if (typeof localStorage === 'undefined') {
    return { token: null, expired: false };
  }

  let token: string | null = null;
  let expired = false;

  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return { token: null, expired: false };
    }

    const expiry = parseExpiry(localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY));

    if (!expiry) {
      return { token, expired: false };
    }

    if (Date.now() >= expiry) {
      expired = true;
      clearStoredAuthSession();
      token = null;
    }
  } catch {
    clearStoredAuthSession();
    token = null;
    expired = true;
  }

  return { token, expired };
}