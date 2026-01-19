-- Migration: Create user_files table for Library feature
-- Run this in Supabase SQL Editor

-- Create user_files table
CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    category TEXT DEFAULT 'document',
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_category ON user_files(category);

-- Enable RLS
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only access their own files
CREATE POLICY "Users can view their own files"
    ON user_files FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files"
    ON user_files FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
    ON user_files FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
    ON user_files FOR DELETE
    USING (auth.uid() = user_id);

-- Create storage bucket for user files (if not exists)
-- Note: This needs to be done via Supabase Dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-library', 'user-library', false);

-- Grant permissions
GRANT ALL ON user_files TO authenticated;
GRANT ALL ON user_files TO service_role;
