-- Remove the unique constraint from normalized_account_email column
-- This allows multiple Overwatch accounts to share the same base Gmail address
-- while using different aliases (e.g., user+acc1@gmail.com, user+acc2@gmail.com)
ALTER TABLE overwatch_accounts 
DROP CONSTRAINT IF EXISTS unique_normalized_email;