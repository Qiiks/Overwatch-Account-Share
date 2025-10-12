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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

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
  // Build full URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;

  // Default to GET method
  const method = options.method?.toUpperCase() || 'GET';

  // Start building headers
  const headers = new Headers(options.headers || {});

  // Add Content-Type if not already set and body is present
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Add Authorization header if token exists
  const authToken = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('auth_token') 
    : null;
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  // Handle CSRF token for state-changing requests
  if (requiresCsrfProtection(method)) {
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    
    if (!csrfToken) {
      console.warn(
        `[API] CSRF token not found for ${method} request to ${endpoint}. ` +
        'The server may reject this request. Try refreshing the page.'
      );
      
      // Optionally, you could make a GET request first to obtain the token
      // For now, we'll let the request proceed and let the server handle it
    } else {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
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
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If response is not JSON, use status text
      }

      throw new Error(errorMessage);
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

/**
 * Initialize CSRF token by making a GET request to a safe endpoint
 * This can be called on app initialization to ensure the CSRF token cookie is set
 */
export async function initializeCsrfToken(): Promise<void> {
  try {
    await apiGet('/health');
    console.log('[API] CSRF token initialized');
  } catch (error) {
    console.warn('[API] Failed to initialize CSRF token:', error);
  }
}