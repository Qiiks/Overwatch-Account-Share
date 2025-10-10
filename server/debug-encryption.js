const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Encryption key from environment
const ENCRYPTION_KEY = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Decrypt function from utils/encryption.js
function decrypt(encryptedText) {
    try {
        // Split the encrypted text into IV and encrypted data
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted text format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = Buffer.from(parts[1], 'hex');
        
        // Create decipher
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(ENCRYPTION_KEY, 'hex'),
            iv
        );
        
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString();
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

async function diagnoseEncryption() {
    console.log('=== Refresh Token Encryption Diagnostic ===\n');
    console.log('Environment Variables Check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.log('- SUPABASE_ANON_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
    console.log('- REFRESH_TOKEN_ENCRYPTION_KEY:', process.env.REFRESH_TOKEN_ENCRYPTION_KEY ? '✓ Set' : '✗ Missing (using random)');
    console.log('\n');

    try {
        // Fetch the specific Google account record
        console.log('Fetching record for gameslayer.inc@gmail.com...\n');
        
        const { data, error } = await supabase
            .from('user_google_accounts')
            .select('*')
            .eq('email', 'gameslayer.inc@gmail.com')
            .single();

        if (error) {
            console.error('Error fetching from database:', error.message);
            return;
        }

        if (!data) {
            console.log('No record found for gameslayer.inc@gmail.com');
            return;
        }

        console.log('Record found:');
        console.log('- ID:', data.id);
        console.log('- User ID:', data.user_id);
        console.log('- Email:', data.email);
        console.log('- Is Primary:', data.is_primary);
        console.log('- Created At:', data.created_at);
        console.log('- Updated At:', data.updated_at);
        console.log('\n');

        // Analyze the refresh_token
        console.log('Refresh Token Analysis:');
        const refreshToken = data.refresh_token;
        
        if (!refreshToken) {
            console.log('✗ Refresh token is NULL or empty');
            return;
        }

        console.log('Raw token value (first 50 chars):', refreshToken.substring(0, 50) + '...');
        console.log('Token length:', refreshToken.length);
        console.log('Contains colon separator:', refreshToken.includes(':') ? 'Yes' : 'No');
        
        // Check if it looks like encrypted format (hex:hex)
        const encryptedPattern = /^[a-f0-9]+:[a-f0-9]+$/i;
        const looksEncrypted = encryptedPattern.test(refreshToken);
        console.log('Matches encrypted format (hex:hex):', looksEncrypted ? 'Yes' : 'No');
        
        // Check if it looks like a Google OAuth refresh token
        const oauthPattern = /^1\/[a-zA-Z0-9_-]+$/;
        const looksLikeOAuthToken = oauthPattern.test(refreshToken);
        console.log('Looks like OAuth refresh token:', looksLikeOAuthToken ? 'Yes' : 'No');
        
        console.log('\n');

        // Attempt decryption
        console.log('Attempting decryption...');
        try {
            const decrypted = decrypt(refreshToken);
            console.log('✓ Decryption successful!');
            console.log('Decrypted value (first 30 chars):', decrypted.substring(0, 30) + '...');
        } catch (decryptError) {
            console.log('✗ Decryption failed:', decryptError.message);
            
            // Additional diagnosis
            if (looksLikeOAuthToken) {
                console.log('\n⚠️ DIAGNOSIS: The token appears to be stored as plain text!');
                console.log('This likely happened because the token was stored before encryption was implemented.');
                console.log('The token value starts with "1/" which is typical for Google OAuth refresh tokens.');
            } else if (!refreshToken.includes(':')) {
                console.log('\n⚠️ DIAGNOSIS: The token does not have the expected format for encrypted data.');
                console.log('Encrypted tokens should be in the format "IV:encryptedData" (hex:hex).');
            } else {
                console.log('\n⚠️ DIAGNOSIS: The token appears to be corrupted or uses a different encryption key.');
            }
        }

        console.log('\n=== Diagnostic Complete ===');

    } catch (err) {
        console.error('Unexpected error:', err);
    } finally {
        process.exit(0);
    }
}

// Run the diagnostic
diagnoseEncryption();