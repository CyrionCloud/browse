-- Create mock user profile for development
-- This fixes the foreign key constraint error when importing skills

-- Insert mock user if doesn't exist
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
