-- Migration: Add OTP and normalization columns to overwatch_accounts table
-- Date: 2025-10-09
-- Purpose: Enable Gmail OTP fetching with proper email variant handling

-- Add new columns to overwatch_accounts table
ALTER TABLE overwatch_accounts
ADD COLUMN normalized_account_email TEXT,
ADD COLUMN otp TEXT,
ADD COLUMN otp_fetched_at TIMESTAMPTZ,
ADD COLUMN otp_expires_at TIMESTAMPTZ;

-- Add indexes for efficient lookups
CREATE INDEX idx_normalized_account_email ON overwatch_accounts(normalized_account_email);
CREATE INDEX idx_account_email_exact ON overwatch_accounts(accountemail);

-- Populate normalized_account_email for existing Gmail records
-- This normalizes Gmail addresses by removing dots and plus addressing
UPDATE overwatch_accounts
SET normalized_account_email = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(accountemail, '\+[^@]*', ''), -- Remove plus addressing
        '\.(?=[^@]*@gmail\.com)', '', 'g' -- Remove dots only in Gmail addresses
    )
)
WHERE accountemail LIKE '%@gmail.com';

-- Add comments for documentation
COMMENT ON COLUMN overwatch_accounts.normalized_account_email IS 'Base Gmail address with dots removed and plus alias stripped (e.g., exampleuser@gmail.com for all variants)';
COMMENT ON COLUMN overwatch_accounts.otp IS 'Current OTP code for this specific account';
COMMENT ON COLUMN overwatch_accounts.otp_fetched_at IS 'Timestamp when the OTP was last fetched';
COMMENT ON COLUMN overwatch_accounts.otp_expires_at IS 'Timestamp when the OTP expires (typically 10 minutes after fetch)';