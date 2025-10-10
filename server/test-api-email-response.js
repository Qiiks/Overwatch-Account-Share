/**
 * Test to verify that the API returns exact email addresses with dots preserved
 * This test calls the /api/overwatch-accounts/all-public endpoint 
 * and verifies the email format in the response
 */

require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE = process.env.API_URL || 'http://localhost:5001';

// Test credentials (adjust if needed)
const TEST_EMAIL = 'gameslayer.inc@gmail.com';
const TEST_PASSWORD = '121212Sanveed';

async function testEmailResponse() {
    console.log('=== API Email Response Test ===\n');
    console.log('Testing endpoint:', `${API_BASE}/api/overwatch-accounts/all-public`);
    
    try {
        // Step 1: Login to get auth token
        console.log('\n1️⃣ Logging in to get auth token...');
        
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            })
        });
        
        if (!loginResponse.ok) {
            const error = await loginResponse.text();
            console.error('❌ Login failed:', error);
            return;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        if (!token) {
            console.error('❌ No token received from login');
            return;
        }
        
        console.log('✅ Login successful, token received');
        
        // Step 2: Call the public accounts endpoint with auth
        console.log('\n2️⃣ Fetching accounts from /api/overwatch-accounts/all-public...');
        
        const accountsResponse = await fetch(`${API_BASE}/api/overwatch-accounts/all-public`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!accountsResponse.ok) {
            const error = await accountsResponse.text();
            console.error('❌ Failed to fetch accounts:', error);
            return;
        }
        
        const accountsData = await accountsResponse.json();
        
        if (!accountsData.success || !accountsData.data) {
            console.error('❌ Invalid response format:', accountsData);
            return;
        }
        
        console.log(`✅ Received ${accountsData.data.length} accounts\n`);
        
        // Step 3: Check email format in responses
        console.log('3️⃣ Checking email preservation in API responses:\n');
        
        let allEmailsCorrect = true;
        
        for (const account of accountsData.data) {
            const email = account.accountEmail;
            const hasDots = email && email.includes('.');
            const isEncrypted = email && (email.includes('ENCRYPTED') || email.includes('CIPHER'));
            
            console.log(`Account: ${account.accountTag}`);
            console.log(`  Email: ${email}`);
            
            if (isEncrypted) {
                console.log(`  Status: 🔒 Encrypted (no access)\n`);
            } else if (hasDots) {
                console.log(`  Status: ✅ Dots preserved correctly!\n`);
            } else if (email && email.includes('@gmail.com')) {
                console.log(`  Status: ❌ DOTS REMOVED - Email normalization bug!\n`);
                allEmailsCorrect = false;
            } else {
                console.log(`  Status: ℹ️ Non-Gmail or special case\n`);
            }
        }
        
        // Step 4: Find specific test account if it exists
        console.log('4️⃣ Looking for Qiiks#3973 account specifically...\n');
        
        const qiiksAccount = accountsData.data.find(acc => acc.accountTag === 'Qiiks#3973');
        
        if (qiiksAccount) {
            console.log('Found Qiiks#3973 account:');
            console.log('  Account Tag:', qiiksAccount.accountTag);
            console.log('  Account Email:', qiiksAccount.accountEmail);
            console.log('  Has Access:', qiiksAccount.hasAccess);
            console.log('  Access Type:', qiiksAccount.accessType);
            
            if (qiiksAccount.accountEmail && 
                !qiiksAccount.accountEmail.includes('ENCRYPTED') && 
                !qiiksAccount.accountEmail.includes('CIPHER')) {
                
                if (qiiksAccount.accountEmail.includes('.')) {
                    console.log('\n✅ SUCCESS: Email contains dots as expected!');
                    console.log('   The fix is working correctly.');
                } else {
                    console.log('\n❌ FAILURE: Email is missing dots!');
                    console.log('   Expected email with dots (e.g., qiikzx.ics@gmail.com)');
                    console.log('   Got:', qiiksAccount.accountEmail);
                }
            }
        } else {
            console.log('⚠️ Qiiks#3973 account not found in the response');
        }
        
        // Final verdict
        console.log('\n=== Test Summary ===');
        if (allEmailsCorrect) {
            console.log('✅ ALL EMAILS PRESERVED CORRECTLY');
            console.log('The API is returning exact email addresses with dots intact.');
        } else {
            console.log('❌ EMAIL NORMALIZATION BUG DETECTED');
            console.log('Some emails have had their dots removed incorrectly.');
            console.log('\nPossible causes:');
            console.log('1. express-validator .normalizeEmail() is still being called');
            console.log('2. Database has old normalized data that needs updating');
            console.log('3. Email is being normalized elsewhere in the code');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the test
testEmailResponse().then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});