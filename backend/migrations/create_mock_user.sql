-- Fix foreign key constraint for development
-- This allows skill imports without requiring actual Supabase auth users

-- Option 1: Drop the foreign key constraint (for development only)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Now insert the mock user profile
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'demo@example.com',
    'Demo User',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify the profile was created
SELECT * FROM profiles WHERE id = '00000000-0000-0000-0000-000000000000';

-- NOTE: For production, you should:
-- 1. Restore the foreign key constraint
-- 2. Use actual Supabase Auth for user management
-- 3. Ensure all users have valid auth.users entries
