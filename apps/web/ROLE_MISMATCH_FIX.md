# Fix: App Shows "Org Admin" but Database Shows "Team"

## The Problem
- App displays: "Org Admin" (bottom left of screen)
- Database shows: "Team" role
- This is a caching/mismatch issue

## Root Cause
The app caches the user role in React state. If the role was changed in the database, the app might still show the old cached value.

## Solution Steps

### Step 1: Check What's Actually in the Database

Run this in Supabase SQL Editor:
```sql
-- Check your current role assignment
SELECT 
  p.id as user_id,
  p.email,
  r.name as role_name_in_db,
  r.is_system_role,
  o.name as organization_name
FROM public.profiles p
LEFT JOIN public.roles r ON p.role_id = r.id
LEFT JOIN public.organizations o ON p.organization_id = o.id
WHERE p.id = auth.uid();
```

This will show you what role is actually assigned in the database.

### Step 2: Fix the Role Assignment (if needed)

If the database shows "Team" but you should be "Org Admin", run:

```sql
-- Fix current user's role to Org Admin
DO $$
DECLARE
  user_org_id UUID;
  org_admin_role_id UUID;
BEGIN
  -- Get current user's organization
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Find Org Admin role
  SELECT id INTO org_admin_role_id
  FROM public.roles
  WHERE organization_id = user_org_id
  AND name = 'Org Admin'
  AND is_system_role = true;
  
  -- Update current user's role
  UPDATE public.profiles
  SET role_id = org_admin_role_id
  WHERE id = auth.uid();
  
  RAISE NOTICE 'Role updated to Org Admin';
END $$;
```

### Step 3: Clear App Cache

After fixing the database:
1. **Hard refresh the browser**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear sessionStorage**: Open browser console and run:
   ```javascript
   sessionStorage.clear();
   localStorage.clear();
   location.reload();
   ```
3. **Or simply log out and log back in**

### Step 4: Verify

After refreshing:
1. Check the bottom left of the app - it should now show "Team" (or "Org Admin" if you fixed it)
2. Check Settings → Your Role should match the database

## Why This Happened

The app loads the role once when you log in and caches it in React state. If someone changed your role in the database while you were logged in, the app wouldn't know until you refresh or log out/in.

## Prevention

The app should refresh the role periodically, but for now, if you change a role in the database, the user needs to:
- Log out and log back in, OR
- Hard refresh the browser

## Quick Diagnostic Script

Run `apps/web/scripts/check-user-role-mismatch.sql` to see:
- Your current role in the database
- All available roles in your organization
- How many users have each role
