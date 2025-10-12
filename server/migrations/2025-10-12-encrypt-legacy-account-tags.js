/**
 * ONE-TIME MIGRATION SCRIPT: Encrypt legacy accountTag data
 * 
 * This script encrypts all plaintext accountTag values in the database.
 * It detects whether an accountTag is already encrypted by attempting to decrypt it.
 * If decryption fails, the value is plaintext and will be encrypted.
 * 
 * USAGE: node server/migrations/2025-10-12-encrypt-legacy-account-tags.js
 */

const { createClient } = require('@supabase/supabase-js');
const { encrypt, decrypt } = require('../utils/encryption');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if an accountTag is already encrypted
 * @param {string} accountTag - The accountTag to check
 * @returns {boolean} - True if already encrypted, false if plaintext
 */
function isEncrypted(accountTag) {
  if (!accountTag) return false;
  
  try {
    // Try to decrypt - if it succeeds, it's encrypted
    decrypt(accountTag);
    return true;
  } catch (error) {
    // Decryption failed - it's plaintext
    return false;
  }
}

/**
 * Main migration function
 */
async function encryptLegacyAccountTags() {
  console.log('🔐 Starting accountTag encryption migration...');
  console.log('📊 Fetching all Overwatch accounts from database...\n');
  
  try {
    // Fetch all accounts from the database
    const { data: accounts, error: fetchError } = await supabase
      .from('overwatch_accounts')
      .select('id, accounttag');
    
    if (fetchError) {
      throw new Error(`Failed to fetch accounts: ${fetchError.message}`);
    }
    
    if (!accounts || accounts.length === 0) {
      console.log('ℹ️  No accounts found in database');
      return;
    }
    
    console.log(`Found ${accounts.length} total accounts\n`);
    
    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let errorCount = 0;
    let nullCount = 0;
    
    // Process each account
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const progress = `[${i + 1}/${accounts.length}]`;
      
      try {
        // Skip if accountTag is null or empty
        if (!account.accounttag) {
          console.log(`${progress} ⚠️  Account ${account.id}: accountTag is null/empty - skipping`);
          nullCount++;
          continue;
        }
        
        // Check if already encrypted
        if (isEncrypted(account.accounttag)) {
          console.log(`${progress} ✓ Account ${account.id}: already encrypted - skipping`);
          alreadyEncryptedCount++;
          continue;
        }
        
        // Encrypt the plaintext accountTag
        const encryptedAccountTag = encrypt(account.accounttag);
        
        // Update the database
        const { error: updateError } = await supabase
          .from('overwatch_accounts')
          .update({ accounttag: encryptedAccountTag })
          .eq('id', account.id);
        
        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }
        
        console.log(`${progress} 🔐 Account ${account.id}: encrypted successfully`);
        encryptedCount++;
        
      } catch (error) {
        console.error(`${progress} ❌ Account ${account.id}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Total accounts found:        ${accounts.length}`);
    console.log(`   Already encrypted:           ${alreadyEncryptedCount}`);
    console.log(`   Newly encrypted:             ${encryptedCount}`);
    console.log(`   Null/empty accountTags:      ${nullCount}`);
    console.log(`   Errors:                      ${errorCount}`);
    console.log('='.repeat(60));
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some accounts encountered errors during encryption');
      console.log('   Please review the error messages above and fix manually if needed');
    }
    
    if (encryptedCount > 0) {
      console.log('\n✅ Successfully encrypted all plaintext accountTag values');
    } else if (alreadyEncryptedCount === accounts.length - nullCount) {
      console.log('\nℹ️  All accountTag values were already encrypted - no changes needed');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  encryptLegacyAccountTags()
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
  encryptLegacyAccountTags,
  isEncrypted
};