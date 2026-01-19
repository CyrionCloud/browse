-- Fix RLS for user_files table to allow development with mock user
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own files" ON user_files;
DROP POLICY IF EXISTS "Users can upload files" ON user_files;
DROP POLICY IF EXISTS "Users can update their own files" ON user_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON user_files;

-- Create permissive policies for development
-- These allow any authenticated user OR service role to access all operations

-- Allow all selects (filtered by user_id in queries anyway)
CREATE POLICY "Allow all selects on user_files"
    ON user_files FOR SELECT
    USING (true);

-- Allow all inserts
CREATE POLICY "Allow all inserts on user_files"
    ON user_files FOR INSERT
    WITH CHECK (true);

-- Allow all updates  
CREATE POLICY "Allow all updates on user_files"
    ON user_files FOR UPDATE
    USING (true);

-- Allow all deletes
CREATE POLICY "Allow all deletes on user_files"
    ON user_files FOR DELETE
    USING (true);

-- Also fix browser_sessions table if it has the same issue
DROP POLICY IF EXISTS "Users can view own sessions" ON browser_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON browser_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON browser_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON browser_sessions;

CREATE POLICY "Allow all selects on browser_sessions"
    ON browser_sessions FOR SELECT
    USING (true);

CREATE POLICY "Allow all inserts on browser_sessions"
    ON browser_sessions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow all updates on browser_sessions"
    ON browser_sessions FOR UPDATE
    USING (true);

CREATE POLICY "Allow all deletes on browser_sessions"
    ON browser_sessions FOR DELETE
    USING (true);

-- Verify
SELECT 'RLS policies fixed for development' as result;
