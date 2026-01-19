-- Migration: Create user_credentials table for secure credential storage
-- Run this in Supabase SQL Editor

-- Create user_credentials table
CREATE TABLE IF NOT EXISTS user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    credential_type TEXT NOT NULL CHECK (credential_type IN ('password', 'credit_card', 'secret', '2fa')),
    name TEXT NOT NULL,
    website_url TEXT,
    username TEXT,
    encrypted_value TEXT NOT NULL,
    extra_data JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_type ON user_credentials(credential_type);

-- Enable RLS
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development (allow all with service role)
CREATE POLICY "Allow all selects on user_credentials"
    ON user_credentials FOR SELECT
    USING (true);

CREATE POLICY "Allow all inserts on user_credentials"
    ON user_credentials FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow all updates on user_credentials"
    ON user_credentials FOR UPDATE
    USING (true);

CREATE POLICY "Allow all deletes on user_credentials"
    ON user_credentials FOR DELETE
    USING (true);

-- Grant permissions
GRANT ALL ON user_credentials TO authenticated;
GRANT ALL ON user_credentials TO service_role;

SELECT 'user_credentials table created' as result;
