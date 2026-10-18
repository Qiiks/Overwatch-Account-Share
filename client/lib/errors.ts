import { ApiError } from '@/lib/api';

/**
 * Human-readable message for anything a catch block can receive.
 * ApiError already carries a server-authored message; everything else falls back to
 * the standard Error message or a generic string.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}
