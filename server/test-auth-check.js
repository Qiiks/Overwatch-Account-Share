// Playwright MCP diagnostic script for authorization check
// This script will test the login flow and examine the authorization comparison

const testAuthCheck = async () => {
  console.log('Starting Playwright MCP auth diagnostic...');
  console.log('This script will test with gameslayer.inc@gmail.com / 121212Sanveed');
  console.log('');
  console.log('Please run this script and observe the console output.');
  console.log('The script uses playwright_mcp tool to:');
  console.log('1. Login to the application');
  console.log('2. Navigate to accounts page');
  console.log('3. Extract and compare user.id with account.owner_id');
  console.log('');
  console.log('Run the playwright_mcp commands manually in sequence to diagnose the issue.');
};

testAuthCheck();

/*
PLAYWRIGHT MCP COMMANDS TO RUN:

1. Navigate to login:
   browser_navigate with url: http://localhost:3000/login

2. Fill and submit login form:
   browser_fill_form with fields:
   - Email field: gameslayer.inc@gmail.com
   - Password field: 121212Sanveed
   
3. Click Sign In button:
   browser_click on Sign In button

4. Wait for navigation:
   browser_wait_for with time: 2

5. Navigate to accounts:
   browser_navigate with url: http://localhost:3000/accounts

6. Wait for accounts to load:
   browser_wait_for with time: 3

7. Extract and compare data:
   browser_evaluate with function:
   () => {
     const userStr = localStorage.getItem('user');
     const user = userStr ? JSON.parse(userStr) : null;
     
     // Try to get accounts from React component state or DOM
     const accountCards = document.querySelectorAll('[class*="account-card"]');
     
     console.log('=== AUTH DIAGNOSTIC RESULTS ===');
     console.log('User from localStorage:', user);
     console.log('User ID:', user?.id);
     console.log('User ID type:', typeof user?.id);
     
     // Try to extract account data from DOM
     if (accountCards.length > 0) {
       console.log('Found', accountCards.length, 'account cards');
       
       // Look for any data attributes or visible owner info
       accountCards.forEach((card, index) => {
         const ownerBadge = card.querySelector('[class*="OWNER"], [class*="owner"]');
         const lockedBadge = card.querySelector('[class*="LOCKED"], [class*="locked"]');
         console.log(`Account ${index + 1}:`, {
           hasOwnerBadge: !!ownerBadge,
           hasLockedBadge: !!lockedBadge
         });
       });
     }
     
     // Try to access React component data
     const reactKey = Object.keys(accountCards[0] || {}).find(key => key.startsWith('__react'));
     if (reactKey && accountCards[0]) {
       const fiber = accountCards[0][reactKey];
       console.log('React fiber found:', !!fiber);
     }
     
     // Return diagnostic data
     return {
       userId: user?.id,
       userIdType: typeof user?.id,
       accountCardsCount: accountCards.length,
       userObject: user
     };
   }

8. Take a snapshot to see the visual state:
   browser_snapshot
*/