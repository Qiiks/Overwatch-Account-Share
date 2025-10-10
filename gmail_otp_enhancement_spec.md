# Gmail OTP Enhancement Technical Specification

## Overview
This specification details the enhancement of the OTP fetching system to properly handle Gmail address variations including dot notation and plus addressing. The system will normalize Gmail addresses for storage while maintaining the ability to identify exact recipient addresses for targeted OTP updates.

## 1. Database Schema Changes

### 1.1 Modifications to `overwatch_accounts` Table

Add the following columns to the `overwatch_accounts` table:

```sql
ALTER TABLE overwatch_accounts
ADD COLUMN normalized_account_email VARCHAR(255),
ADD COLUMN otp VARCHAR(10),
ADD COLUMN otp_fetched_at TIMESTAMP,
ADD COLUMN otp_expires_at TIMESTAMP;

-- Add index for efficient lookups
CREATE INDEX idx_normalized_account_email ON overwatch_accounts(normalized_account_email);
CREATE INDEX idx_account_email_exact ON overwatch_accounts(accountemail);
```

**Column Purposes:**
- `normalized_account_email`: Stores the base Gmail address with dots removed and plus alias stripped (e.g., `exampleuser@gmail.com` for all variants). This enables grouping all variants of the same Gmail account.
- `otp`: Stores the current OTP code for this specific account
- `otp_fetched_at`: Timestamp when the OTP was last fetched
- `otp_expires_at`: Timestamp when the OTP expires (typically 10 minutes after fetch)

### 1.2 Migration Script

```sql
-- Populate normalized_account_email for existing records
UPDATE overwatch_accounts
SET normalized_account_email = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(accountemail, '\+[^@]*', ''), -- Remove plus addressing
        '\.(?=[^@]*@gmail\.com)', '', 'g' -- Remove dots only in Gmail addresses
    )
)
WHERE accountemail LIKE '%@gmail.com';
```

## 2. Email Normalization Utility

### 2.1 New File: `server/utils/emailNormalizer.js`

```javascript
/**
 * Email normalization utility for handling Gmail address variations
 */

class EmailNormalizer {
    /**
     * Get the normalized base email address
     * Removes dots and plus addressing for Gmail accounts
     * @param {string} email - The email address to normalize
     * @returns {string} - The normalized base email
     */
    static getNormalizedEmail(email) {
        if (!email) return null;
        
        email = email.toLowerCase().trim();
        
        // Only normalize Gmail addresses
        if (!email.endsWith('@gmail.com')) {
            return email;
        }
        
        // Split email into local and domain parts
        const [localPart, domain] = email.split('@');
        
        // Remove plus addressing (everything after +)
        let normalizedLocal = localPart.split('+')[0];
        
        // Remove all dots from the local part
        normalizedLocal = normalizedLocal.replace(/\./g, '');
        
        return `${normalizedLocal}@${domain}`;
    }
    
    /**
     * Get the email variant (preserves plus addressing and dots)
     * Used for exact matching
     * @param {string} email - The email address
     * @returns {string} - The lowercase trimmed email
     */
    static getEmailVariant(email) {
        if (!email) return null;
        return email.toLowerCase().trim();
    }
    
    /**
     * Check if two Gmail addresses are variants of the same account
     * @param {string} email1 - First email address
     * @param {string} email2 - Second email address
     * @returns {boolean} - True if they are variants of the same Gmail account
     */
    static areGmailVariants(email1, email2) {
        return this.getNormalizedEmail(email1) === this.getNormalizedEmail(email2);
    }
    
    /**
     * Extract the plus alias from an email address
     * @param {string} email - The email address
     * @returns {string|null} - The plus alias or null if none exists
     */
    static extractPlusAlias(email) {
        if (!email || !email.includes('+')) return null;
        
        const match = email.match(/\+([^@]+)@/);
        return match ? match[1] : null;
    }
}

module.exports = EmailNormalizer;
```

## 3. Controller Logic Updates

### 3.1 Modifications to `overwatchAccountController.js`

Update the `addAccount` and `updateAccount` methods to generate and save normalized emails:

```javascript
// In addAccount method, after line 98 (before createOverwatchAccount call)
const EmailNormalizer = require('../utils/emailNormalizer');

// Generate normalized email if it's a Gmail account
const normalizedEmail = EmailNormalizer.getNormalizedEmail(accountEmail);

const newAccount = await createOverwatchAccount({
    accountTag: accountTag,
    accountEmail,
    accountPassword,
    owner_id: req.user.id,
    linked_google_account_id: googleAccountId || null,
    normalized_account_email: normalizedEmail // Add this field
});

// In updateAccount method, add normalization when email is updated
if (email !== undefined && email !== '') {
    updateData.accountEmail = email;
    updateData.normalized_account_email = EmailNormalizer.getNormalizedEmail(email);
}
```

### 3.2 Update `OverwatchAccount.js` Model

Modify the `createOverwatchAccount` and `updateOverwatchAccount` functions to handle the new field:

```javascript
// In createOverwatchAccount, add to insertData
const insertData = {
    ...rest,
    accountemail: accountEmail,
    accountpassword: hashedPassword,
    accounttag: accountTag,
    normalized_account_email: rest.normalized_account_email // Add this
};

// In updateOverwatchAccount, add mapping
if (updateData.normalized_account_email !== undefined) {
    mappedUpdateData.normalized_account_email = updateData.normalized_account_email;
}
```

## 4. OTP Service Complete Refactoring

### 4.1 New `server/services/otpService.js` Implementation

```javascript
const { google } = require('googleapis');
const UserGoogleAccount = require('../models/UserGoogleAccount');
const OverwatchAccount = require('../models/OverwatchAccount');
const encryption = require('../utils/encryption');
const EmailNormalizer = require('../utils/emailNormalizer');
const getSupabase = () => global.supabase;

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
            process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL}/api/google-auth/otp/callback`
        );

        const refreshToken = encryption.decrypt(account.refresh_token);
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        this.oauth2Clients.set(googleAccountId, oauth2Client);
        return oauth2Client;
    }

    /**
     * Extract recipient email from message headers
     * @param {Object} headers - Email headers
     * @returns {string|null} - The recipient email address
     */
    extractRecipientEmail(headers) {
        // Look for 'To' header
        const toHeader = headers.find(h => h.name.toLowerCase() === 'to');
        if (toHeader && toHeader.value) {
            // Extract email from "Name <email@domain.com>" format or just "email@domain.com"
            const match = toHeader.value.match(/<([^>]+)>/) || toHeader.value.match(/([^\s<>]+@[^\s<>]+)/);
            return match ? match[1].toLowerCase() : null;
        }
        
        // Fallback to 'Delivered-To' header if available
        const deliveredToHeader = headers.find(h => h.name.toLowerCase() === 'delivered-to');
        if (deliveredToHeader && deliveredToHeader.value) {
            return deliveredToHeader.value.toLowerCase();
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
     * Main method to fetch OTPs for all accounts
     * Iterates through all Google accounts and fetches emails
     */
    async fetchOTPsForAllAccounts(io) {
        try {
            console.log('[OTP Service] Starting OTP fetch cycle...');
            
            // Get all active Google accounts across all users
            const googleAccounts = await UserGoogleAccount.find({ is_active: true });
            
            console.log(`[OTP Service] Found ${googleAccounts.length} active Google accounts`);
            
            for (const googleAccount of googleAccounts) {
                try {
                    await this.fetchOTPsFromGoogleAccount(googleAccount, io);
                } catch (error) {
                    console.error(`[OTP Service] Error fetching from Google account ${googleAccount.email}:`, error.message);
                    
                    // Handle authentication errors
                    if (error.response && [400, 401].includes(error.response.status)) {
                        console.error(`[OTP Service] Deactivating Google account ${googleAccount.id} due to auth error`);
                        await getSupabase()
                            .from('user_google_accounts')
                            .update({ is_active: false })
                            .eq('id', googleAccount.id);
                    }
                }
            }
            
            console.log('[OTP Service] OTP fetch cycle completed');
        } catch (error) {
            console.error('[OTP Service] Critical error in fetch cycle:', error);
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

        // Fetch recent Battle.net verification emails
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'from:noreply@battle.net subject:"Battle.net Account Verification" newer_than:1h',
            maxResults: 10,
        });

        const messages = res.data.messages || [];
        
        if (messages.length === 0) {
            console.log(`[OTP Service] No recent verification emails found for ${googleAccount.email}`);
            return;
        }

        console.log(`[OTP Service] Processing ${messages.length} verification emails from ${googleAccount.email}`);

        for (const message of messages) {
            try {
                // Get full message with headers
                const msg = await gmail.users.messages.get({ 
                    userId: 'me', 
                    id: message.id, 
                    format: 'full' 
                });

                // Extract recipient email from headers
                const recipientEmail = this.extractRecipientEmail(msg.data.payload.headers || []);
                
                if (!recipientEmail) {
                    console.log(`[OTP Service] Could not extract recipient email from message ${message.id}`);
                    continue;
                }

                console.log(`[OTP Service] Message ${message.id} sent to: ${recipientEmail}`);

                // Find the exact Overwatch account by matching the exact email
                const { data: overwatchAccount, error } = await getSupabase()
                    .from('overwatch_accounts')
                    .select('*')
                    .eq('accountemail', recipientEmail)
                    .single();

                if (error || !overwatchAccount) {
                    console.log(`[OTP Service] No Overwatch account found for email: ${recipientEmail}`);
                    continue;
                }

                // Extract HTML body
                const htmlBody = this.extractHtmlBody(msg.data.payload);
                
                if (!htmlBody) {
                    console.log(`[OTP Service] No HTML body found in message ${message.id}`);
                    continue;
                }

                // Extract OTP from body
                const otp = this.extractOTPFromBody(htmlBody);
                
                if (!otp) {
                    console.log(`[OTP Service] No OTP found in message ${message.id}`);
                    continue;
                }

                // Update the specific account with the OTP
                await this.updateAccountOTP(overwatchAccount, otp, io);
                
                console.log(`[OTP Service] Successfully updated OTP for ${overwatchAccount.accounttag} (${recipientEmail}): ${otp}`);
            } catch (error) {
                console.error(`[OTP Service] Error processing message ${message.id}:`, error.message);
            }
        }
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
     * Update Overwatch account with OTP
     * @param {Object} account - The Overwatch account
     * @param {string} otp - The OTP code
     * @param {Object} io - Socket.io instance
     */
    async updateAccountOTP(account, otp, io) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

        // Update database
        const { error } = await getSupabase()
            .from('overwatch_accounts')
            .update({
                otp: otp,
                otp_fetched_at: now.toISOString(),
                otp_expires_at: expiresAt.toISOString()
            })
            .eq('id', account.id);

        if (error) {
            throw error;
        }

        // Emit real-time update
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
        
        // Emit to owner
        io.to(account.owner_id.toString()).emit('otp', payload);
        
        // TODO: Also emit to allowed users if needed
    }

    /**
     * Clean up expired OTPs
     */
    async cleanupExpiredOTPs() {
        const { error } = await getSupabase()
            .from('overwatch_accounts')
            .update({
                otp: null,
                otp_fetched_at: null,
                otp_expires_at: null
            })
            .lt('otp_expires_at', new Date().toISOString())
            .not('otp', 'is', null);

        if (error) {
            console.error('[OTP Service] Error cleaning up expired OTPs:', error);
        }
    }

    /**
     * Start the OTP fetching scheduler
     * @param {Object} io - Socket.io instance
     */
    startScheduler(io) {
        console.log('[OTP Service] Starting OTP scheduler...');
        
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

module.exports = new OTPService();
```

### 4.2 Update Main Service Entry Point

Update `server/services/otpService.js` export:

```javascript
const otpService = require('../utils/otpService');

const startOtpFetching = (io) => {
    otpService.startScheduler(io);
};

module.exports = { startOtpFetching };
```

## 5. API Endpoint Updates

### 5.1 New Endpoint: Get Account OTP

Add to `server/routes/overwatchAccount.js`:

```javascript
// GET /api/overwatch-accounts/:id/otp
router.get('/:id/otp', authMiddleware, async (req, res) => {
    try {
        const account = await findOverwatchAccountById(req.params.id);
        
        if (!account) {
            return res.status(404).json({ 
                success: false, 
                error: 'Account not found' 
            });
        }
        
        // Check authorization
        if (account.owner_id !== req.user.id) {
            // Check if user has shared access
            const hasAccess = await checkUserAccess(account.id, req.user.id);
            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Not authorized' 
                });
            }
        }
        
        // Check if OTP is still valid
        if (account.otp && account.otp_expires_at) {
            const expiresAt = new Date(account.otp_expires_at);
            if (expiresAt > new Date()) {
                return res.json({
                    success: true,
                    data: {
                        otp: account.otp,
                        expiresAt: account.otp_expires_at,
                        fetchedAt: account.otp_fetched_at
                    }
                });
            }
        }
        
        return res.json({
            success: true,
            data: {
                otp: null,
                message: 'No valid OTP available'
            }
        });
    } catch (error) {
        console.error('Error fetching OTP:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch OTP' 
        });
    }
});
```

## 6. Frontend Updates

### 6.1 Update AccountsList Component

Modify the WebSocket handler to display OTP with account email:

```typescript
// In the socket.on('otp') handler
socket.on('otp', (data: { 
    otp: string; 
    accountTag: string; 
    accountEmail?: string;
    timestamp: string 
}) => {
    setAccounts(prevAccounts => 
        prevAccounts.map(account => {
            // Match by exact email first, then by accountTag
            if (account.accountEmail === data.accountEmail || 
                account.accountTag === data.accountTag) {
                return { ...account, otp: data.otp };
            }
            return account;
        })
    );
});
```

## 7. Testing Strategy

### 7.1 Unit Tests

Create `server/tests/emailNormalizer.test.js`:

```javascript
const EmailNormalizer = require('../utils/emailNormalizer');

describe('EmailNormalizer', () => {
    test('normalizes Gmail addresses correctly', () => {
        expect(EmailNormalizer.getNormalizedEmail('example.user@gmail.com'))
            .toBe('exampleuser@gmail.com');
        expect(EmailNormalizer.getNormalizedEmail('example.user+battlenet@gmail.com'))
            .toBe('exampleuser@gmail.com');
        expect(EmailNormalizer.getNormalizedEmail('Example.User+Tag@gmail.com'))
            .toBe('exampleuser@gmail.com');
    });
    
    test('preserves non-Gmail addresses', () => {
        expect(EmailNormalizer.getNormalizedEmail('user@outlook.com'))
            .toBe('user@outlook.com');
    });
    
    test('identifies Gmail variants correctly', () => {
        expect(EmailNormalizer.areGmailVariants(
            'example.user@gmail.com',
            'exampleuser+battlenet@gmail.com'
        )).toBe(true);
    });
});
```

### 7.2 Integration Tests

Create test scenarios for:
1. Creating accounts with Gmail variants
2. Fetching OTPs for specific email variants
3. Verifying OTP updates only affect the correct account
4. Testing expiration cleanup

## 8. Migration Plan

### Phase 1: Database Updates
1. Run migration to add new columns
2. Populate `normalized_account_email` for existing records

### Phase 2: Backend Updates
1. Deploy email normalizer utility
2. Update models and controllers
3. Deploy new OTP service

### Phase 3: Testing & Validation
1. Test with sample Gmail accounts
2. Verify OTP targeting accuracy
3. Monitor logs for issues

### Phase 4: Frontend Updates
1. Update WebSocket handlers
2. Add email display in OTP updates
3. Test real-time updates

## 9. Security Considerations

1. **Scope Limitation**: Continue using `gmail.readonly` scope for security
2. **OTP Expiration**: Implement 10-minute expiration for OTPs
3. **Access Control**: Verify user authorization before revealing OTPs
4. **Audit Logging**: Log all OTP fetch attempts and access

## 10. Performance Optimizations

1. **Indexed Lookups**: Use database indexes on `accountemail` and `normalized_account_email`
2. **Batch Processing**: Process multiple emails in parallel where possible
3. **Caching**: Cache OAuth2 clients to avoid repeated authentication
4. **Rate Limiting**: Implement rate limiting on OTP fetch endpoints

## 11. Monitoring & Alerting

1. **Metrics to Track**:
   - OTP fetch success rate
   - Average fetch time
   - Email variant distribution
   - Failed authentication attempts

2. **Alerts**:
   - Google account authentication failures
   - Unusual OTP fetch patterns
   - High error rates

## 12. Documentation Updates

Update API documentation to include:
- New OTP endpoint
- Email normalization behavior
- Gmail variant handling
- WebSocket event changes

## Conclusion

This enhancement will provide robust handling of Gmail address variations, ensuring that OTPs are correctly targeted to specific Overwatch accounts regardless of dot notation or plus addressing used. The system maintains backward compatibility while adding sophisticated email variant recognition and targeted OTP delivery.