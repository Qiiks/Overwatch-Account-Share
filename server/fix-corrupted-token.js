const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteCorruptedGoogleAccount() {
    console.log('=== Fixing Corrupted Google Account Record ===\n');

    const targetEmail = 'gameslayer.inc@gmail.com';
    
    try {
        // First, fetch the record to confirm it exists
        console.log(`Fetching record for ${targetEmail}...`);
        const { data: existingRecord, error: fetchError } = await supabase
            .from('user_google_accounts')
            .select('*')
            .eq('email', targetEmail)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching record:', fetchError.message);
            return;
        }

        if (!existingRecord) {
            console.log(`✗ No record found for ${targetEmail}`);
            console.log('The record may have already been deleted.');
            return;
        }

        console.log('✓ Found record:');
        console.log('  - ID:', existingRecord.id);
        console.log('  - User ID:', existingRecord.user_id);
        console.log('  - Email:', existingRecord.email);
        console.log('  - Is Primary:', existingRecord.is_primary);
        console.log('  - Token Status: CORRUPTED\n');

        // Delete the corrupted record
        console.log('Deleting corrupted record...');
        const { error: deleteError } = await supabase
            .from('user_google_accounts')
            .delete()
            .eq('email', targetEmail);

        if (deleteError) {
            console.error('✗ Error deleting record:', deleteError.message);
            return;
        }

        console.log('✓ Successfully deleted corrupted record!\n');
        console.log('=== Next Steps ===');
        console.log('1. Log into the application');
        console.log('2. Navigate to the Google Accounts Manager section');
        console.log(`3. Re-link the ${targetEmail} account`);
        console.log('4. Complete the OAuth flow to generate a new, properly encrypted refresh token');
        console.log('\nThe new token will be correctly encrypted with the REFRESH_TOKEN_ENCRYPTION_KEY from your .env file.');

    } catch (err) {
        console.error('Unexpected error:', err);
    } finally {
        process.exit(0);
    }
}

// Run the fix
deleteCorruptedGoogleAccount();