/**
 * The single HTTP entry point for the app.
 *
 * - Base URL: NEXT_PUBLIC_API_BASE_URL (default "/api"; dev: http://localhost:5001/api).
 *   Paths may be written bare ("/auth/me") or fully ("/api/auth/me") — both resolve.
 * - Credentials: the session lives in an httpOnly cookie, so every call is `credentials: 'include'`.
 * - CSRF: the token comes from GET /api/auth/csrf (response body), is cached in memory and sent as
 *   `x-csrf-token` on non-GET requests; a CSRF_* failure refetches once and retries once.
 */

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: { message?: string; code?: string; details?: unknown };
}

const resolveUrl = (path: string) => {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/+$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Tolerate call sites written against the full path while the base already carries /api.
  if (base.endsWith('/api') && normalized.startsWith('/api/')) {
    return `${base}${normalized.slice(4)}`;
  }
  return `${base}${normalized}`;
};

let csrfToken: string | null = null;

export async function getCsrfToken(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;

  const response = await fetch(resolveUrl('/auth/csrf'), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<{ token?: string }> | null;
  const token = body?.data?.token;

  if (!response.ok || typeof token !== 'string') {
    throw new ApiError(
      response.status || 500,
      'CSRF_FETCH_FAILED',
      'Could not establish a CSRF token. Reload the page and try again.',
    );
  }

  csrfToken = token;
  return token;
}

const request = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  retryOnCsrf = true,
): Promise<T> => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    try {
      headers['x-csrf-token'] = await getCsrfToken();
    } catch (error) {
      // Inside this branch method is never GET, so only the retry flag gates the throw.
      if (retryOnCsrf) throw error;
    }
  }

  const response = await fetch(resolveUrl(path), {
    method,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || payload?.success === false) {
    const error = payload?.error;
    const code = error?.code || (response.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL');
    const message = error?.message || `Request failed (${response.status})`;

    // A stale CSRF token is recoverable: refetch and retry once.
    if (code.startsWith('CSRF_') && method !== 'GET' && retryOnCsrf) {
      await getCsrfToken(true);
      return request<T>(method, path, body, false);
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:expired'));
    }

    throw new ApiError(response.status, code, message, error?.details);
  }

  // Success envelope; a legacy bare body is tolerated so partial migrations keep working.
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return (payload.data as T) ?? (undefined as unknown as T);
  }
  return payload as unknown as T;
};

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {});
export const apiPut = <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {});
export const apiPatch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {});
export const apiDelete = <T>(path: string, body?: unknown) => request<T>('DELETE', path, body);

/** Downloads a non-JSON response (CSV/file export) with the session cookie attached. */
export const apiDownload = async (path: string): Promise<Blob> => {
  const response = await fetch(resolveUrl(path), { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(response.status, 'INTERNAL', `Request failed (${response.status})`);
  }
  return response.blob();
};
