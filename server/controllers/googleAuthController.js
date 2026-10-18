const { google } = require('googleapis');
const crypto = require('crypto');
const encryption = require('../utils/encryption');
const UserGoogleAccount = require('../models/UserGoogleAccount');
const { logger } = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');

// Validate OAUTH_STATE_SECRET is set
if (!process.env.OAUTH_STATE_SECRET) {
  throw new Error('OAUTH_STATE_SECRET environment variable is required but not set');
}

// sha256-derived key: any secret length works, and it matches utils/encryption.js.
const STATE_KEY = crypto
  .createHash('sha256')
  .update(String(process.env.OAUTH_STATE_SECRET))
  .digest();

const resolveRedirectUri = () => {
  const configured = process.env.GOOGLE_REDIRECT_URI;

  if (!configured || configured.trim() === '') {
    logger.error('CRITICAL: GOOGLE_REDIRECT_URI is not set in environment variables');
    throw new Error('Google OAuth redirect URI is not configured on the server.');
  }

  try {
    return new URL(configured).toString();
  } catch (err) {
    logger.error('CRITICAL: GOOGLE_REDIRECT_URI is not a valid URL', { value: configured });
    throw new Error('Google OAuth redirect URI is invalid on the server.');
  }
};

// Where the browser is bounced back to. One name for it, with FRONTEND_URL as the legacy alias.
const clientUrl = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * The OAuth state carries the user id, so it is authenticated (AES-256-GCM):
 * a forged state would otherwise bind the callback to an attacker-chosen user.
 */
const encryptState = (data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', STATE_KEY, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
};

const decryptState = (text) => {
  const parts = String(text).split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid state format');
  }
  const [ivHex, tagHex, encrypted] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', STATE_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * The return path comes from the client, so it is a same-app path or nothing. Requiring a
 * single leading "/" already rules out the userinfo trick ("@evil.com" can only be a path
 * once the host is closed), "//host", and any scheme; control characters are rejected too so
 * nothing odd can reach the Location header.
 */
const safeRedirectPath = (value) => {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return '/dashboard';
  }
  if (/[\u0000-\u001f\u007f]/.test(path)) {
    return '/dashboard';
  }
  return path;
};

exports.initGoogleOTPAuth = async (req, res, next) => {
  try {
    const { redirectUrl } = req.body;
    const userId = req.user.id;
    const redirectUri = resolveRedirectUri();

    const stateData = {
      userId,
      redirectUrl: safeRedirectPath(redirectUrl),
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const state = encryptState(JSON.stringify(stateData));

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state,
      prompt: 'consent',
      redirectUri,
    });

    return ok(res, { authUrl });
  } catch (error) {
    next(error);
  }
};

exports.googleOTPCallback = async (req, res) => {
  const { code, state, error } = req.query;

  let stateData;
  try {
    stateData = JSON.parse(decryptState(state));
    if (Date.now() - stateData.timestamp > 600000) {
      // 10 minute expiry
      throw new Error('OAuth state expired');
    }
  } catch (err) {
    logger.error('OAuth state error:', { error: err.message });
    return res.redirect(`${clientUrl()}/dashboard?oauth_error=invalid_state`);
  }

  if (error) {
    return res.redirect(`${clientUrl()}${stateData.redirectUrl}?oauth_error=${error}`);
  }

  try {
    const redirectUri = resolveRedirectUri();
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!tokens.refresh_token) {
      // Happens when the user already granted consent and was not re-prompted;
      // long-term OTP access needs the refresh token.
      return res.redirect(
        `${clientUrl()}${stateData.redirectUrl}?oauth_error=no_refresh_token`,
      );
    }

    const encryptedRefreshToken = encryption.encrypt(tokens.refresh_token);
    const encryptedAccessToken = tokens.access_token
      ? encryption.encrypt(tokens.access_token)
      : null;

    await UserGoogleAccount.upsert({
      user_id: stateData.userId,
      email: userInfo.email,
      display_name: userInfo.name,
      refresh_token: encryptedRefreshToken,
      access_token: encryptedAccessToken,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: tokens.scope.split(' '),
    });

    // Back to the page the flow started on (the mailbox list lives on /dashboard), not a
    // hardcoded /accounts — otherwise a successful link lands somewhere the result is invisible.
    return res.redirect(
      `${clientUrl()}${stateData.redirectUrl}?oauth_success=true`,
    );
  } catch (err) {
    logger.error('OAuth callback error:', err);
    return res.redirect(
      `${clientUrl()}${stateData.redirectUrl}?oauth_error=authentication_failed`,
    );
  }
};

exports.listGoogleAccounts = async (req, res, next) => {
  try {
    const accounts = await UserGoogleAccount.findByUserId(req.user.id);

    const mappedAccounts = accounts.map((account) => ({
      id: account.id,
      google_email: account.email,
      is_primary: account.is_primary,
      display_name: account.display_name,
      is_active: account.is_active,
      last_used: account.last_used,
      last_otp_fetch: account.last_otp_fetch,
      otp_fetch_count: account.otp_fetch_count,
    }));

    return ok(res, { accounts: mappedAccounts });
  } catch (error) {
    next(error);
  }
};

exports.deleteGoogleAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    // The model function ensures the user can only delete their own accounts.
    const deleted = await UserGoogleAccount.deleteById(id, req.user.id);
    if (!deleted) {
      throw new ApiError(404, 'NOT_FOUND', 'Linked account not found');
    }
    return ok(res, {});
  } catch (error) {
    next(error);
  }
};
