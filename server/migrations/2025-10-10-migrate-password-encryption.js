/**
 * CRITICAL MIGRATION SCRIPT: Handle password encryption transition
 * 
 * IMPORTANT SECURITY NOTES:
 * - Bcrypt hashes are ONE-WAY and CANNOT be converted to AES encryption
 * - This script marks existing passwords and handles new encryption
 * - Existing users will need to update their passwords to enable decryption
 */

const { createClient } = require('@supabase/supabase-js');
const { encrypt } = require('../utils/encryption');
const bcrypt = require('bcrypt');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migratePasswordEncryption() {
  console.log('🔐 Starting password encryption migration...');
  console.log('⚠️  WARNING: This is a critical security operation');
  
  try {
    // Step 1: Apply the SQL migration first
    console.log('📝 Ensuring password_encryption_type column exists...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE overwatch_accounts 
        ADD COLUMN IF NOT EXISTS password_encryption_type VARCHAR(10) DEFAULT 'bcrypt';
      `
    });
    
    if (alterError && !alterError.message.includes('already exists')) {
      throw alterError;
    }
    
    // Step 2: Get all accounts
    console.log('📊 Fetching all Overwatch accounts...');
    const { data: accounts, error: fetchError } = await supabase
      .from('overwatch_accounts')
      .select('id, accountpassword, password_encryption_type');
    
    if (fetchError) throw fetchError;
    
    console.log(`Found ${accounts.length} accounts to process`);
    
    let bcryptCount = 0;
    let aesCount = 0;
    let errorCount = 0;
    
    // Step 3: Process each account
    for (const account of accounts) {
      try {
        // Check if already processed
        if (account.password_encryption_type === 'aes') {
          aesCount++;
          continue;
        }
        
        // Detect if password is already encrypted with AES (contains colons)
        if (account.accountpassword && account.accountpassword.includes(':')) {
          // This looks like AES encryption format (iv:authTag:encrypted)
          const parts = account.accountpassword.split(':');
          if (parts.length === 3) {
            // Mark as AES encrypted
            await supabase
              .from('overwatch_accounts')
              .update({ password_encryption_type: 'aes' })
              .eq('id', account.id);
            aesCount++;
            continue;
          }
        }
        
        // This is a bcrypt hash - mark it as such
        // IMPORTANT: We CANNOT convert bcrypt to AES without the original password
        await supabase
          .from('overwatch_accounts')
          .update({ 
            password_encryption_type: 'bcrypt',
            // Add a flag that this account needs password update for full feature access
            needs_password_update: true
          })
          .eq('id', account.id);
        bcryptCount++;
        
      } catch (err) {
        console.error(`Error processing account ${account.id}:`, err.message);
        errorCount++;
      }
    }
    
    // Step 4: Report results
    console.log('\n✅ Migration completed:');
    console.log(`   - Bcrypt passwords (legacy): ${bcryptCount}`);
    console.log(`   - AES encrypted passwords: ${aesCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    if (bcryptCount > 0) {
      console.log('\n⚠️  IMPORTANT: ');
      console.log(`   ${bcryptCount} accounts still use bcrypt hashing.`);
      console.log('   These users will need to update their passwords to enable credential viewing.');
      console.log('   The system will prompt them to update when they next log in.');
    }
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Update the controllers to use AES for NEW passwords');
    console.log('   2. Implement password update flow for existing users');
    console.log('   3. Add UI indicators for accounts needing password updates');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Add a helper function to create a test account with AES encryption
async function createTestAccountWithAES() {
  console.log('\n🧪 Creating test account with AES encryption...');
  
  const testPassword = 'TestPassword123!';
  const encryptedPassword = encrypt(testPassword);
  
  const { data, error } = await supabase
    .from('overwatch_accounts')
    .insert({
      accounttag: 'TestUser#9999',
      accountemail: 'test@example.com',
      accountpassword: encryptedPassword,
      password_encryption_type: 'aes',
      owner_id: '00000000-0000-0000-0000-000000000000' // Placeholder, replace with actual user ID
    })
    .select();
  
  if (error) {
    console.log('Test account creation failed (may already exist):', error.message);
  } else {
    console.log('✅ Test account created with AES encryption');
    console.log('   Battletag: TestUser#9999');
    console.log('   Original password:', testPassword);
    console.log('   Encrypted password:', encryptedPassword);
  }
}

// Run the migration
if (require.main === module) {
  migratePasswordEncryption()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  migratePasswordEncryption,
  createTestAccountWithAES
};