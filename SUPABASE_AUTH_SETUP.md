# Supabase Auth Configuration Guide

## Backend Setup (.env)

Add to `/backend/.env`:
```bash
SUPABASE_JWT_SECRET=your-jwt-secret-here
ENABLE_AUTH=true
```

**Get JWT Secret:**
1. Go to https://supabase.com
2. Select your project
3. Settings → API → JWT Settings
4. Copy **JWT Secret**

## Disable Email Confirmation (Dev Only)

1. Supabase Dashboard → Authentication → Email Templates
2. Click **Confirm signup** template
3. Toggle **OFF** "Enable email confirmations"
4. Save

**OR** use SQL:
```sql
-- In Supabase SQL Editor
UPDATE auth.config 
SET value = 'false' 
WHERE name = 'email_confirm_required';
```

## Test Auth Flow

1. Visit `/auth/signup`
2. Create account (no email confirmation needed)
3. Auto-redirected to `/dashboard`
4. Skills are now tied to YOUR user ID
5. Logout and login works
6. Data persists across devices

## Verify User Isolation

```bash
# Create test account A
curl -X POST http://localhost:3000/api/auth/signup \\
  -d '{"email":"user-a@test.com","password":"test123"}'

# Create skill as user A
# Login as user B
# Verify user B cannot see user A's private skills
```

## Production Settings

**Before deploying:**
1. ✅ Re-enable email confirmation
2. ✅ Set strong JWT secret
3. ✅ Enable RLS on all tables
4. ✅ Review auth policies
5. ✅ Set proper CORS origins
