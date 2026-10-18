/**
 * Cookie configuration shared by auth and CSRF.
 *
 * Both cookies are httpOnly: the client never reads them with JavaScript.
 * The CSRF token travels in the response body of GET /api/auth/csrf instead
 * (cross-origin JavaScript cannot read a cookie set by another host anyway).
 */
const AUTH_COOKIE = 'auth_token';
const CSRF_COOKIE = 'csrf-token';

const baseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  path: '/',
});

const authCookieOptions = (maxAgeMs) =>
  maxAgeMs ? { ...baseOptions(), maxAge: maxAgeMs } : { ...baseOptions() };

const csrfCookieOptions = (maxAgeMs) =>
  maxAgeMs ? { ...baseOptions(), maxAge: maxAgeMs } : { ...baseOptions() };

// Attributes must match the ones used when the cookie was set, or the browser keeps it.
const clearCookieOptions = () => ({ ...baseOptions() });

module.exports = {
  AUTH_COOKIE,
  CSRF_COOKIE,
  authCookieOptions,
  csrfCookieOptions,
  clearCookieOptions,
};
