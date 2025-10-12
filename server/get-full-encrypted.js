require('dotenv').config();
const dbClient = require('./config/db');
const supabase = dbClient.supabase;

(async () => {
  try {
    const { data: accounts, error } = await supabase
      .from('overwatch_accounts')
      .select('id, accounttag')
      .limit(2);
    
    if (error) {
      console.error('Database error:', error);
      process.exit(1);
    }
    
    console.log('Full encrypted accounttag values:\n');
    
    accounts.forEach((account, index) => {
      console.log(`Account ${index + 1} (ID: ${account.id}):`);
      console.log(`Full encrypted string: ${account.accounttag}`);
      console.log(`Length: ${account.accounttag?.length || 0} characters`);
      console.log();
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();