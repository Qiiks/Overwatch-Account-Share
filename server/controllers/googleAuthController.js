const { google } = require('googleapis');
const crypto = require('crypto');
const encryption = require('../utils/encryption');
const UserGoogleAccount = require('../models/UserGoogleAccount');

const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'default-oauth-state-secret-for-dev';

const resolveRedirectUri = () => {
  const configured = process.env.GOOGLE_REDIRECT_URI;
  
  if (!configured || configured.trim() === '') {
    console.error('CRITICAL: GOOGLE_REDIRECT_URI is not set in environment variables.');
    throw new Error('Google OAuth redirect URI is not configured on the server.');
  }
  
  try {
    // Validate that it's a proper URL
    return new URL(configured).toString();
  } catch (err) {
    console.error('CRITICAL: GOOGLE_REDIRECT_URI is not a valid URL.', { value: configured });
    throw new Error('Google OAuth redirect URI is invalid on the server.');
  }
};

// A simple state encryption for this step.
const encryptState = (data) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(OAUTH_STATE_SECRET.padEnd(32, '0')), iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decryptState = (text) => {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(OAUTH_STATE_SECRET.padEnd(32, '0')), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};


exports.initGoogleOTPAuth = async (req, res) => {
  try {
    const { redirectUrl } = req.body;
    const userId = req.user.id;
    const redirectUri = resolveRedirectUri();

    const stateData = {
      userId,
      redirectUrl: redirectUrl || '/dashboard',
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const state = encryptState(JSON.stringify(stateData));

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      state,
      prompt: 'consent',
      redirectUri
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    res.status(500).json({ message: 'Failed to initiate Google account linking.' });
  }
};

exports.googleOTPCallback = async (req, res) => {
  const { code, state, error } = req.query;
  
  let stateData;
  try {
    stateData = JSON.parse(decryptState(state));
    if (Date.now() - stateData.timestamp > 600000) { // 10 minute expiry
      throw new Error('OAuth state expired');
    }
  } catch (err) {
    console.error('OAuth state error:', err.message);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?oauth_error=invalid_state`);
  }

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}${stateData.redirectUrl}?oauth_error=${error}`);
  }

  try {
    const redirectUri = resolveRedirectUri();
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    if (!tokens.refresh_token) {
        // This can happen if the user has already granted consent and is not re-prompted.
        // We need the refresh token for long-term access.
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}${stateData.redirectUrl}?oauth_error=no_refresh_token`);
    }

    const encryptedRefreshToken = encryption.encrypt(tokens.refresh_token);
    const encryptedAccessToken = tokens.access_token ? encryption.encrypt(tokens.access_token) : null;

    await UserGoogleAccount.upsert({
      user_id: stateData.userId,
      email: userInfo.email,
      display_name: userInfo.name,
      refresh_token: encryptedRefreshToken,
      access_token: encryptedAccessToken,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: tokens.scope.split(' ')
    });

    res.redirect(`${process.env.FRONTEND_URL}/accounts?oauth_success=true`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}${stateData.redirectUrl}?oauth_error=authentication_failed`);
  }
};

exports.listGoogleAccounts = async (req, res) => {
    try {
        const accounts = await UserGoogleAccount.findByUserId(req.user.id);
        
        // Map the database field names to what the frontend expects
        const mappedAccounts = accounts.map(account => ({
            id: account.id,
            google_email: account.email,  // Map 'email' to 'google_email'
            is_primary: account.is_primary,
            display_name: account.display_name,
            is_active: account.is_active,
            last_used: account.last_used,
            last_otp_fetch: account.last_otp_fetch,
            otp_fetch_count: account.otp_fetch_count
        }));
        
        res.json({ accounts: mappedAccounts });
    } catch (error) {
        console.error('Error listing Google accounts:', error);
        res.status(500).json({ message: 'Failed to retrieve linked accounts.' });
    }
};

exports.deleteGoogleAccount = async (req, res) => {
    try {
        const { id } = req.params;
        // The model function ensures the user can only delete their own accounts.
        await UserGoogleAccount.deleteById(id, req.user.id);
        res.json({ success: true, message: 'Google account unlinked successfully.' });
    } catch (error) {
        console.error('Error deleting Google account:', error);
        res.status(500).json({ message: 'Failed to unlink account.' });
    }
};