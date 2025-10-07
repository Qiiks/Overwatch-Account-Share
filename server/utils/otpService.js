const { google } = require('googleapis');
const UserGoogleAccount = require('../models/UserGoogleAccount');
const encryption = require('./encryption');

class OTPService {
    constructor() {
        this.oauth2Clients = new Map();
    }

    async getOAuth2Client(googleAccountId) {
        if (this.oauth2Clients.has(googleAccountId)) {
            return this.oauth2Clients.get(googleAccountId);
        }

        const account = await UserGoogleAccount.findById(googleAccountId);
        if (!account || !account.refresh_token) {
            throw new Error(`Google account or refresh token not found for ID: ${googleAccountId}`);
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.API_URL || 'http://localhost:5000'}/api/google-auth/otp/callback`
        );

        const refreshToken = encryption.decrypt(account.refresh_token);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        this.oauth2Clients.set(googleAccountId, oauth2Client);
        return oauth2Client;
    }

    async fetchOTPForAccount(overwatchAccount, io) {
        try {
            const primaryAccount = await UserGoogleAccount.findOne({
                userId: overwatchAccount.owner_id,
                isPrimary: true
            });

            if (!primaryAccount) {
                // No primary account configured for the owner, so we can't fetch OTPs.
                console.log(`No primary Google account found for user ${overwatchAccount.owner_id}`);
                return null;
            }

            const oauth2Client = await this.getOAuth2Client(primaryAccount.id);
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            const res = await gmail.users.messages.list({
                userId: 'me',
                q: 'is:unread from:battle.net',
                maxResults: 1,
            });

            const messages = res.data.messages || [];
            if (messages.length === 0) return null;

            const message = messages[0];
            const msg = await gmail.users.messages.get({ userId: 'me', id: message.id, format: 'full' });

            const htmlBody = Buffer.from(msg.data.payload.parts.find(part => part.mimeType === 'text/html').body.data, 'base64').toString('utf-8');
            const otpMatch = htmlBody.match(/<em[^>]*>([A-Z0-9]{6,8})<\/em>/);

            if (otpMatch && otpMatch[1]) {
                const otp = otpMatch[1];
                this.emitOTP(io, overwatchAccount, otp);
                
                // Note: Emails remain unread as we only have gmail.readonly scope
                // This enhances security by reducing permissions needed

                return otp;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching OTP for account ${overwatchAccount.accounttag}:`, error);
            // Handle token errors, e.g., by deactivating the linked account
            if (error.response && (error.response.status === 400 || error.response.status === 401)) {
                // Potentially a revoked token
                console.error(`Deactivating Google account due to auth error.`);
                // await UserGoogleAccount.deactivate(googleAccountId);
            }
            return null;
        }
    }

    emitOTP(io, account, otp) {
        const payload = {
            otp,
            accountTag: account.accounttag,
            timestamp: new Date().toISOString()
        };
        io.to(account.owner_id.toString()).emit('otp', payload);
        // Also emit to allowed users if applicable
    }
}

module.exports = new OTPService();