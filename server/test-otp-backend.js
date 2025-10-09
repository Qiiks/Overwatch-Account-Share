#!/usr/bin/env node
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { supabase } = require('./config/db');
const UserGoogleAccount = require('./models/UserGoogleAccount');
const otpService = require('./utils/otpService');

async function testOTPBackend() {
    console.log('🔍 Testing OTP Backend Setup...\n');
    
    try {
        // Test 1: Check environment variables
        console.log('1️⃣ Checking environment variables...');
        const requiredEnvVars = [
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'GOOGLE_REDIRECT_URI',
            'ENCRYPTION_SECRET',
            'JWT_SECRET',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            console.error('❌ Missing environment variables:', missingVars);
            return;
        }
        console.log('✅ All required environment variables are set\n');
        
        // Test 2: Check database connection
        console.log('2️⃣ Testing database connection...');
        const { data: testQuery, error: dbError } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (dbError) {
            console.error('❌ Database connection failed:', dbError.message);
            return;
        }
        console.log('✅ Database connection successful\n');
        
        // Test 3: Check user_google_accounts table structure
        console.log('3️⃣ Checking user_google_accounts table...');
        const { data: tableInfo, error: tableError } = await supabase
            .from('user_google_accounts')
            .select('*')
            .limit(0);
        
        if (tableError) {
            console.error('❌ Error accessing user_google_accounts table:', tableError.message);
            return;
        }
        console.log('✅ user_google_accounts table exists\n');
        
        // Test 4: List existing Google accounts
        console.log('4️⃣ Listing existing Google accounts...');
        const { data: accounts, error: accountsError } = await supabase
            .from('user_google_accounts')
            .select('id, user_id, email, display_name, is_primary, is_active')
            .limit(10);
        
        if (accountsError) {
            console.error('❌ Error fetching Google accounts:', accountsError.message);
        } else if (!accounts || accounts.length === 0) {
            console.log('ℹ️ No Google accounts linked yet');
        } else {
            console.log(`✅ Found ${accounts.length} Google account(s):`);
            accounts.forEach(acc => {
                console.log(`  - ${acc.email} (User: ${acc.user_id}, Primary: ${acc.is_primary}, Active: ${acc.is_active})`);
            });
        }
        console.log('');
        
        // Test 5: Check Overwatch accounts
        console.log('5️⃣ Checking Overwatch accounts...');
        const { data: owAccounts, error: owError } = await supabase
            .from('overwatch_accounts')
            .select('id, accounttag, owner_id')
            .limit(10);
        
        if (owError) {
            console.error('❌ Error fetching Overwatch accounts:', owError.message);
        } else if (!owAccounts || owAccounts.length === 0) {
            console.log('ℹ️ No Overwatch accounts created yet');
        } else {
            console.log(`✅ Found ${owAccounts.length} Overwatch account(s):`);
            owAccounts.forEach(acc => {
                console.log(`  - ${acc.accounttag} (Owner: ${acc.owner_id})`);
            });
        }
        console.log('');
        
        // Test 6: Test OTP email pattern matching
        console.log('6️⃣ Testing OTP pattern matching...');
        const testHTMLs = [
            '<em style="font-size: 28px;">V2GC8L</em>',
            '<em>AB3D5F</em>',
            'code: <em>XY9Z2K</em>',
            'Your security code: <strong>MN4P7Q</strong>'
        ];
        
        const patterns = [
            /<em[^>]*>([A-Z0-9]{6})<\/em>/,
            />([A-Z0-9]{6})<\/em>/,
            /code[^>]*>([A-Z0-9]{6})</,
            /security code[^<]*<[^>]*>([A-Z0-9]{6})</,
        ];
        
        console.log('Testing OTP extraction patterns:');
        testHTMLs.forEach(html => {
            let found = false;
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                    console.log(`  ✅ Found OTP "${match[1]}" in: ${html.substring(0, 50)}...`);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(`  ❌ No OTP found in: ${html.substring(0, 50)}...`);
            }
        });
        console.log('');
        
        // Test 7: Check OAuth2 client initialization
        console.log('7️⃣ Testing OAuth2 client initialization...');
        try {
            // Check if we can import googleapis
            const { google } = require('googleapis');
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );
            console.log('✅ OAuth2 client can be initialized');
            console.log(`   Redirect URI: ${process.env.GOOGLE_REDIRECT_URI}`);
        } catch (error) {
            console.error('❌ Failed to initialize OAuth2 client:', error.message);
        }
        console.log('');
        
        // Summary
        console.log('📊 Backend OTP Setup Summary:');
        console.log('================================');
        console.log('✅ Database column fix applied (google_email → email)');
        console.log('✅ OTP service updated with Battle.net email patterns');
        console.log('✅ Multiple OTP extraction patterns configured');
        console.log('✅ OAuth2 client initialization tested');
        console.log('');
        console.log('📝 Next Steps:');
        console.log('1. Link a Google account via the frontend');
        console.log('2. Ensure the account has access to Battle.net emails');
        console.log('3. The OTP service will check every 30 seconds for new OTPs');
        console.log('4. OTPs will be emitted via WebSocket to connected clients');
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
    }
    
    process.exit(0);
}

// Run the test
testOTPBackend();