const { google } = require('googleapis');
const UserGoogleAccount = require('../models/UserGoogleAccount');
const OverwatchAccount = require('../models/OverwatchAccount');
const encryption = require('../utils/encryption');
const { logger } = require('../utils/logger');

class OTPService {
    constructor() {
        this.oauth2Clients = new Map();
    }

    /**
     * Get or create OAuth2 client for a Google account
     * @param {string} googleAccountId - The Google account ID
     * @returns {Object} - OAuth2 client
     */
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
            process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL || 'http://localhost:5001'}/api/google-auth/otp/callback`
        );

        const refreshToken = encryption.decrypt(account.refresh_token);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        this.oauth2Clients.set(googleAccountId, oauth2Client);
        return oauth2Client;
    }

    /**
     * Extract recipient email from message headers
     * @param {Array} headers - Email headers
     * @returns {string|null} - The recipient email address
     */
    extractRecipientEmail(headers) {
        try {
            // Look for 'To' header
            const toHeader = headers.find(h => h.name.toLowerCase() === 'to');
            if (toHeader && toHeader.value) {
                // Parse the header value to extract clean email
                // Handle formats like "Name <email@domain.com>" or just "email@domain.com"
                const match = toHeader.value.match(/<([^>]+)>/) || toHeader.value.match(/([^\s<>,]+@[^\s<>,]+)/);
                if (match && match[1]) {
                    return match[1].toLowerCase().trim();
                }
            }
            
            // Fallback to 'Delivered-To' header if available
            const deliveredToHeader = headers.find(h => h.name.toLowerCase() === 'delivered-to');
            if (deliveredToHeader && deliveredToHeader.value) {
                // Clean up the value and extract email
                const cleanValue = deliveredToHeader.value.toLowerCase().trim();
                // Handle potential angle brackets in Delivered-To as well
                const match = cleanValue.match(/<([^>]+)>/) || cleanValue.match(/([^\s<>,]+@[^\s<>,]+)/);
                if (match && match[1]) {
                    return match[1];
                }
                // If no match, return the clean value as is (it might already be just an email)
                return cleanValue;
            }
            
            // Try X-Original-To header as another fallback
            const xOriginalToHeader = headers.find(h => h.name.toLowerCase() === 'x-original-to');
            if (xOriginalToHeader && xOriginalToHeader.value) {
                const cleanValue = xOriginalToHeader.value.toLowerCase().trim();
                const match = cleanValue.match(/<([^>]+)>/) || cleanValue.match(/([^\s<>,]+@[^\s<>,]+)/);
                if (match && match[1]) {
                    return match[1];
                }
                return cleanValue;
            }
        } catch (error) {
            logger.error('[OTP Service] Error parsing email headers:', error);
        }
        
        return null;
    }

    /**
     * Extract OTP from email HTML body
     * @param {string} htmlBody - The HTML body of the email
     * @returns {string|null} - The extracted OTP or null
     */
    extractOTPFromBody(htmlBody) {
        const patterns = [
            /<em[^>]*>([A-Z0-9]{6})<\/em>/,
            /<em[^>]*>([A-Z0-9]{6,8})<\/em>/,
            />([A-Z0-9]{6})<\/em>/,
            /code[^>]*>([A-Z0-9]{6})</,
            /security code[^<]*<[^>]*>([A-Z0-9]{6})</,
        ];

        for (const pattern of patterns) {
            const match = htmlBody.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    /**
     * Extract HTML body from email payload
     * @param {Object} payload - Email payload
     * @returns {string|null} - The HTML body or null
     */
    extractHtmlBody(payload) {
        const findHtmlPart = (part) => {
            if (part.mimeType === 'text/html' && part.body && part.body.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.parts) {
                for (const subPart of part.parts) {
                    const html = findHtmlPart(subPart);
                    if (html) return html;
                }
            }
            return null;
        };

        return findHtmlPart(payload) || null;
    }

    /**
     * Main loop - Iterate through all active Google accounts and fetch OTPs
     * @param {Object} io - Socket.io instance for real-time updates
     */
    async fetchOTPsForAllAccounts(io) {
        try {
            logger.info('[OTP Service] Starting OTP fetch cycle...');
            
            // Get all active Google accounts across all users
            const googleAccounts = await UserGoogleAccount.find({ is_active: true });
            
            if (!googleAccounts || googleAccounts.length === 0) {
                logger.info('[OTP Service] No active Google accounts found');
                return;
            }
            
            logger.info(`[OTP Service] Found ${googleAccounts.length} active Google accounts`);
            
            for (const googleAccount of googleAccounts) {
                try {
                    await this.fetchOTPsFromGoogleAccount(googleAccount, io);
                } catch (error) {
                    logger.error(`[OTP Service] Error fetching from Google account ${googleAccount.email}:`, error.message);
                    
                    // Handle authentication errors
                    if (error.response && [400, 401].includes(error.response.status)) {
                        logger.warn(`[OTP Service] Deactivating Google account ${googleAccount.id} due to auth error`);
                        await UserGoogleAccount.deactivate(googleAccount.id);
                    }
                }
            }
            
            logger.info('[OTP Service] OTP fetch cycle completed');
        } catch (error) {
            logger.error('[OTP Service] Critical error in fetch cycle:', error);
        }
    }

    /**
     * Fetch OTPs from a specific Google account
     * @param {Object} googleAccount - The Google account to fetch from
     * @param {Object} io - Socket.io instance for real-time updates
     */
    async fetchOTPsFromGoogleAccount(googleAccount, io) {
        const oauth2Client = await this.getOAuth2Client(googleAccount.id);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Fetch recent unread Battle.net verification emails
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'from:noreply@battle.net subject:"Battle.net Account Verification" is:unread newer_than:1h',
            maxResults: 10,
        });

        const messages = res.data.messages || [];
        
        if (messages.length === 0) {
            if (process.env.NODE_ENV !== 'production') {
                logger.debug(`[OTP Service] No recent unread verification emails found for ${googleAccount.email}`);
            }
            return;
        }

        logger.info(`[OTP Service] Processing ${messages.length} verification emails from ${googleAccount.email}`);

        for (const message of messages) {
            try {
                // Get full message with headers
                const msg = await gmail.users.messages.get({ 
                    userId: 'me', 
                    id: message.id, 
                    format: 'full' 
                });

                // Extract recipient email from headers using email-header-parser
                const recipientEmail = this.extractRecipientEmail(msg.data.payload.headers || []);
                
                if (!recipientEmail) {
                    if (process.env.NODE_ENV !== 'production') {
                        logger.debug(`[OTP Service] Could not extract recipient email from message ${message.id}`);
                    }
                    continue;
                }

                if (process.env.NODE_ENV !== 'production') {
                    logger.debug(`[OTP Service] Message ${message.id} sent to: ${recipientEmail}`);
                }

                // Find the exact Overwatch account by matching the exact email
                const overwatchAccount = await OverwatchAccount.findByEmail(recipientEmail);

                if (!overwatchAccount) {
                    if (process.env.NODE_ENV !== 'production') {
                        logger.debug(`[OTP Service] No Overwatch account found for email: ${recipientEmail}`);
                    }
                    continue;
                }

                // Extract HTML body
                const htmlBody = this.extractHtmlBody(msg.data.payload);
                
                if (!htmlBody) {
                    if (process.env.NODE_ENV !== 'production') {
                        logger.debug(`[OTP Service] No HTML body found in message ${message.id}`);
                    }
                    continue;
                }

                // Extract OTP from body
                const otp = this.extractOTPFromBody(htmlBody);
                
                if (!otp) {
                    if (process.env.NODE_ENV !== 'production') {
                        logger.debug(`[OTP Service] No OTP found in message ${message.id}`);
                    }
                    continue;
                }

                // Update the specific account with the OTP
                await this.updateAccountOTP(overwatchAccount, otp, io);
                
                logger.info(`[OTP Service] Successfully updated OTP for account (${recipientEmail})`);
                
                // Mark the email as read to prevent reprocessing
                await gmail.users.messages.modify({
                    userId: 'me',
                    id: message.id,
                    requestBody: {
                        removeLabelIds: ['UNREAD']
                    }
                }).catch(err => {
                    // If we don't have permission to modify, just log it
                    if (process.env.NODE_ENV !== 'production') {
                        logger.debug(`[OTP Service] Could not mark message ${message.id} as read:`, err.message);
                    }
                });
                
            } catch (error) {
                logger.error(`[OTP Service] Error processing message ${message.id}:`, error.message);
            }
        }
    }

    /**
     * Update Overwatch account with OTP in database
     * @param {Object} account - The Overwatch account
     * @param {string} otp - The OTP code
     * @param {Object} io - Socket.io instance
     */
    async updateAccountOTP(account, otp, io) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

        // Update database with new OTP and timestamps
        const updatedAccount = await OverwatchAccount.updateOverwatchAccount(account.id, {
            otp: otp,
            otp_fetched_at: now.toISOString(),
            otp_expires_at: expiresAt.toISOString()
        });

        if (!updatedAccount) {
            throw new Error('Failed to update account with OTP');
        }

        // Emit real-time update via WebSocket
        this.emitOTP(io, account, otp);
    }

    /**
     * Emit OTP update via WebSocket
     * @param {Object} io - Socket.io instance
     * @param {Object} account - The Overwatch account
     * @param {string} otp - The OTP code
     */
    emitOTP(io, account, otp) {
        const payload = {
            otp,
            accountTag: account.accounttag,
            accountEmail: account.accountemail,
            timestamp: new Date().toISOString()
        };
        
        // Emit to owner's room
        io.to(account.owner_id.toString()).emit('otp_update', payload);
        
        // Also emit to global 'otp' event for backward compatibility
        io.to(account.owner_id.toString()).emit('otp', payload);
        
        if (process.env.NODE_ENV !== 'production') {
            logger.debug(`[OTP Service] Emitted OTP update to user ${account.owner_id}`);
        }
    }

    /**
     * Clean up expired OTPs from database
     */
    async cleanupExpiredOTPs() {
        try {
            const expiredAccounts = await OverwatchAccount.clearExpiredOTPs();
            if (expiredAccounts > 0) {
                logger.info(`[OTP Service] Cleaned up ${expiredAccounts} expired OTPs`);
            }
        } catch (error) {
            logger.error('[OTP Service] Error cleaning up expired OTPs:', error);
        }
    }

    /**
     * Start the OTP fetching scheduler
     * @param {Object} io - Socket.io instance
     */
    startScheduler(io) {
        logger.info('[OTP Service] Starting OTP scheduler...');
        
        // Fetch OTPs every 30 seconds
        setInterval(() => {
            this.fetchOTPsForAllAccounts(io);
        }, 30000);
        
        // Clean up expired OTPs every 5 minutes
        setInterval(() => {
            this.cleanupExpiredOTPs();
        }, 5 * 60 * 1000);
        
        // Initial fetch
        this.fetchOTPsForAllAccounts(io);
    }
}

// Export singleton instance and start function for backward compatibility
const otpService = new OTPService();

const startOtpFetching = (io) => {
    logger.info('Starting OTP fetching service...');
    otpService.startScheduler(io);
};

module.exports = { startOtpFetching, otpService };