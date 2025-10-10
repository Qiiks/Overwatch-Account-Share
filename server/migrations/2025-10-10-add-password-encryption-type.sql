-- CRITICAL MIGRATION: Add password encryption type tracking
-- This migration adds support for reversible AES encryption alongside existing bcrypt hashes

-- Add column to track encryption method (bcrypt or aes)
ALTER TABLE overwatch_accounts 
ADD COLUMN IF NOT EXISTS password_encryption_type VARCHAR(10) DEFAULT 'bcrypt';

-- Create index for faster queries on encryption type
CREATE INDEX IF NOT EXISTS idx_password_encryption_type 
ON overwatch_accounts(password_encryption_type);

-- Mark all existing passwords as bcrypt (they are currently hashed with bcrypt)
UPDATE overwatch_accounts 
SET password_encryption_type = 'bcrypt' 
WHERE password_encryption_type IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN overwatch_accounts.password_encryption_type IS 
'Tracks password storage method: bcrypt (one-way hash) or aes (reversible encryption)';