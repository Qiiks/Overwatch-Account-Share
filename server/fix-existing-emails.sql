-- SQL script to fix existing normalized emails in the database
-- This restores the dots in Gmail addresses that were incorrectly normalized

-- Fix the Qiiks#3973 account specifically
UPDATE overwatch_accounts 
SET accountemail = 'qiikzx.ics@gmail.com'
WHERE accounttag = 'Qiiks#3973' 
  AND accountemail = 'qiikzxics@gmail.com';

-- You can add more UPDATE statements here for other accounts that need fixing
-- For example:
-- UPDATE overwatch_accounts 
-- SET accountemail = 'correct.email@gmail.com'
-- WHERE accounttag = 'YourTag#1234' 
--   AND accountemail = 'correctemail@gmail.com';

-- Verify the fix
SELECT accounttag, accountemail, normalized_account_email 
FROM overwatch_accounts 
WHERE accounttag = 'Qiiks#3973';