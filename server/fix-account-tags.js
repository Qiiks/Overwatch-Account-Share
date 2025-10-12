require('dotenv').config();
const dbClient = require('./config/db');
const supabase = dbClient.supabase;
const { encrypt } = require('./utils/encryption');

(async () => {
  try {
    console.log('🔧 Fixing encrypted account tags with correct plaintext values...\n');
    
    // Define the correct mappings
    const accountMappings = [
      {
        email: 'qiikzx.ics@gmail.com',
        battletag: 'Qiiks#3973'
      },
      {
        email: 'tripper0010@gmail.com',
        battletag: 'WetChungus#3258'
      }
    ];
    
    for (const mapping of accountMappings) {
      // Find the user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', mapping.email)
        .single();
      
      if (userError || !user) {
        console.log(`❌ User not found for email: ${mapping.email}`);
        continue;
      }
      
      console.log(`✓ Found user: ${mapping.email} (ID: ${user.id})`);
      
      // Find the account owned by this user
      const { data: account, error: accountError } = await supabase
        .from('overwatch_accounts')
        .select('id, accounttag')
        .eq('owner_id', user.id)
        .single();
      
      if (accountError || !account) {
        console.log(`  ❌ No account found for this user`);
        continue;
      }
      
      console.log(`  ✓ Found account ID: ${account.id}`);
      console.log(`  📝 Old (encrypted): ${account.accounttag?.substring(0, 50)}...`);
      
      // Encrypt the correct battletag
      const encryptedTag = encrypt(mapping.battletag);
      console.log(`  🔐 New battletag: ${mapping.battletag}`);
      console.log(`  🔐 Encrypted to: ${encryptedTag.substring(0, 50)}...`);
      
      // Update the database
      const { error: updateError } = await supabase
        .from('overwatch_accounts')
        .update({ accounttag: encryptedTag })
        .eq('id', account.id);
      
      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`  ✅ Successfully updated account tag!`);
      }
      
      console.log();
    }
    
    console.log('✅ All account tags have been fixed!');
    console.log('\nNow clearing cache...');
    
    // Clear cache
    const { cache } = require('./utils/cache');
    await cache.clear();
    console.log('✅ Cache cleared!');
    
    console.log('\n🎉 Fix complete! Refresh your dashboard to see the decrypted account tags.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();