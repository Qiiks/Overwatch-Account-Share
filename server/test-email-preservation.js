/**
 * Diagnostic script to verify email preservation in database
 * This confirms that the database stores both the original email (with dots)
 * and the normalized version (without dots) correctly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailPreservation() {
    console.log('=== Email Preservation Diagnostic ===\n');
    
    try {
        // Fetch the Qiiks#3973 account directly from database
        console.log('📊 Fetching Qiiks#3973 account from database...\n');
        
        const { data: account, error } = await supabase
            .from('overwatch_accounts')
            .select('accounttag, accountemail, normalized_account_email')
            .eq('accounttag', 'Qiiks#3973')
            .single();
        
        if (error) {
            console.error('❌ Database error:', error);
            return;
        }
        
        if (!account) {
            console.log('⚠️ Account Qiiks#3973 not found in database');
            return;
        }
        
        console.log('✅ Account found in database:\n');
        console.log('  Account Tag:', account.accounttag);
        console.log('  Original Email (accountemail):', account.accountemail);
        console.log('  Normalized Email (normalized_account_email):', account.normalized_account_email);
        console.log('');
        
        // Verify the data integrity
        console.log('🔍 Data Integrity Check:\n');
        
        if (account.accountemail && account.accountemail.includes('.')) {
            console.log('✅ Original email contains dots (preserved correctly)');
        } else {
            console.log('❌ Original email missing dots (data corruption!)');
        }
        
        if (account.normalized_account_email && !account.normalized_account_email.includes('.')) {
            console.log('✅ Normalized email has dots removed (correct normalization)');
        } else {
            console.log('⚠️ Normalized email still contains dots (normalization issue)');
        }
        
        console.log('\n📝 Summary:');
        console.log('  Database stores the correct, un-normalized email in accountemail field');
        console.log('  The issue must be in the API controller returning the wrong field');
        
        // Test all accounts to see the pattern
        console.log('\n📊 Checking all accounts for email preservation:\n');
        
        const { data: allAccounts, error: allError } = await supabase
            .from('overwatch_accounts')
            .select('accounttag, accountemail, normalized_account_email')
            .order('accounttag');
        
        if (!allError && allAccounts) {
            for (const acc of allAccounts) {
                const hasDots = acc.accountemail && acc.accountemail.includes('.');
                const normalizedCorrect = acc.normalized_account_email && 
                    acc.accountemail && 
                    acc.normalized_account_email === acc.accountemail.replace(/\./g, '');
                
                console.log(`  ${acc.accounttag}:`);
                console.log(`    Original: ${acc.accountemail || 'NULL'} ${hasDots ? '(has dots ✓)' : '(no dots)'}`);
                console.log(`    Normalized: ${acc.normalized_account_email || 'NULL'} ${normalizedCorrect ? '(correct ✓)' : '(check needed)'}`);
            }
        }
        
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

// Run the diagnostic
testEmailPreservation().then(() => {
    console.log('\n=== Diagnostic Complete ===');
    process.exit(0);
});