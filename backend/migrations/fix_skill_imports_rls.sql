-- Fix RLS policies for skill imports
-- Simplified version for development/testing

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own imports" ON skill_imports;
DROP POLICY IF EXISTS "Users can manage own imports" ON skill_imports;
DROP POLICY IF EXISTS "Allow viewing skill imports" ON skill_imports;
DROP POLICY IF EXISTS "Allow creating skill imports" ON skill_imports;
DROP POLICY IF EXISTS "Allow updating own imports" ON skill_imports;
DROP POLICY IF EXISTS "Allow deleting own imports" ON skill_imports;

-- Create permissive policies for development
CREATE POLICY "skill_imports_select_policy"
ON skill_imports FOR SELECT
USING (true);

CREATE POLICY "skill_imports_insert_policy"
ON skill_imports FOR INSERT
WITH CHECK (true);

CREATE POLICY "skill_imports_update_policy"
ON skill_imports FOR UPDATE
USING (true);

CREATE POLICY "skill_imports_delete_policy"
ON skill_imports FOR DELETE
USING (true);

-- Also fix user_skills table for imports to work
DROP POLICY IF EXISTS "Users can view own skills" ON user_skills;
DROP POLICY IF EXISTS "Users can manage own skills" ON user_skills;

CREATE POLICY "user_skills_select_policy"
ON user_skills FOR SELECT
USING (true);

CREATE POLICY "user_skills_insert_policy"
ON user_skills FOR INSERT
WITH CHECK (true);

CREATE POLICY "user_skills_update_policy"
ON user_skills FOR UPDATE
USING (true);

CREATE POLICY "user_skills_delete_policy"
ON user_skills FOR DELETE
USING (true);
