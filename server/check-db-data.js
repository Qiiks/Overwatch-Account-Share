require('dotenv').config();
const dbClient = require('./config/db');
const supabase = dbClient.supabase;
const { decrypt } = require('./utils/encryption');

(async () => {
  try {
    // Fetch a sample account to see what the accounttag looks like
    const { data: accounts, error } = await supabase
      .from('overwatch_accounts')
      .select('id, accounttag')
      .limit(3);
    
    if (error) {
      console.error('Database error:', error);
      process.exit(1);
    }
    
    console.log('Sample accounts from database:');
    console.log('================================');
    
    accounts.forEach((account, index) => {
      console.log(`\nAccount ${index + 1}:`);
      console.log('  ID:', account.id);
      console.log('  Raw accounttag:', account.accounttag?.substring(0, 80) + (account.accounttag?.length > 80 ? '...' : ''));
      console.log('  Format check:', account.accounttag?.includes(':') ? 'ENCRYPTED (has colons)' : 'PLAINTEXT (no colons)');
      
      // Try to decrypt
      if (account.accounttag) {
        try {
          const decrypted = decrypt(account.accounttag);
          console.log('  ✓ Decrypted:', decrypted);
        } catch (error) {
          console.log('  ✗ Decryption failed:', error.message);
          console.log('  → This is likely plaintext data');
        }
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();