-- Migration: Create settings table for key-value configuration storage
-- Date: 2025-10-10
-- Purpose: Establishes a settings table to store application configuration
--          including the registration toggle and other system settings

-- Create the settings table if it doesn't exist
-- Note: The table might already exist from previous migrations
-- This migration ensures it exists and has the correct structure
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default value for registration toggle
-- Using ON CONFLICT to avoid errors if the setting already exists
INSERT INTO settings (key, value) 
VALUES ('allow_registration', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert other default settings that might be useful
INSERT INTO settings (key, value) 
VALUES 
    ('require_email_verification', 'false'::jsonb),
    ('max_accounts_per_user', '10'::jsonb),
    ('maintenance_mode', 'false'::jsonb),
    ('system_message', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add comment to table for documentation
COMMENT ON TABLE settings IS 'Key-value store for application configuration and feature toggles';
COMMENT ON COLUMN settings.key IS 'Unique identifier for the setting';
COMMENT ON COLUMN settings.value IS 'JSON value containing the setting data';

-- Create trigger to update updatedAt timestamp automatically
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to avoid errors on re-run)
DROP TRIGGER IF EXISTS settings_updated_at_trigger ON settings;

-- Create the trigger
CREATE TRIGGER settings_updated_at_trigger
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_settings_updated_at();