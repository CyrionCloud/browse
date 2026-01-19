-- Fix RLS policies for skills table to allow forking and creation
-- This allows users to create skills (fork or create new)

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view public skills" ON skills;
DROP POLICY IF EXISTS "Users can create skills" ON skills;
DROP POLICY IF EXISTS "Users can update own skills" ON skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON skills;

-- Create permissive policies for development
CREATE POLICY "skills_select_policy"
ON skills FOR SELECT
USING (true);

CREATE POLICY "skills_insert_policy"
ON skills FOR INSERT
WITH CHECK (true);

CREATE POLICY "skills_update_policy"
ON skills FOR UPDATE
USING (true);

CREATE POLICY "skills_delete_policy"
ON skills FOR DELETE
USING (true);

-- Also fix skill_forks table if needed
DROP POLICY IF EXISTS "Users can view forks" ON skill_forks;
DROP POLICY IF EXISTS "Users can create forks" ON skill_forks;

CREATE POLICY "skill_forks_select_policy"
ON skill_forks FOR SELECT
USING (true);

CREATE POLICY "skill_forks_insert_policy"
ON skill_forks FOR INSERT
WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('skills', 'skill_forks')
ORDER BY tablename, policyname;
