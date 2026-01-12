# Quick Fix Instructions for Roles RLS Error

## The Error You're Seeing
```
Error creating role: 
{code: '42501', message: 'new row violates row-level security policy for table "roles"'}
```

This means the INSERT/UPDATE/DELETE policies for the roles table are missing.

## Solution: Run the SQL Script

### Option 1: Quick Fix (Recommended)
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `apps/web/scripts/fix-roles-rls-complete.sql`
3. Click **Run**
4. Verify the policies were created (you should see 3 policies in the results)

### Option 2: Diagnostic First (If Option 1 doesn't work)
1. Run `apps/web/scripts/diagnose-roles-rls.sql` first to check:
   - If the function exists
   - What policies currently exist
   - Your current user's permissions
2. Then run `apps/web/scripts/fix-roles-rls-complete.sql`

### Option 3: With Debug Output
Run `apps/web/scripts/fix-roles-rls-with-debug.sql` which includes verification steps

## Important Notes

1. **You must be logged in as an Org Admin** (or user with `can_manage_roles` permission) when running the script
2. The script creates a function `user_can_manage_roles()` that checks permissions
3. The script adds 3 policies:
   - INSERT: Users with `can_manage_roles` can create roles
   - UPDATE: Users with `can_manage_roles` can update roles  
   - DELETE: Users with `can_manage_roles` can delete roles (system roles protected)

## After Running the Script

1. **Test role creation** - Try creating a role in the UI
2. **Check console** - The 403/42501 errors should be gone
3. **Verify** - Run the diagnostic script again to confirm policies exist

## If It Still Doesn't Work

1. Check that your user has the `can_manage_roles` permission:
   ```sql
   SELECT 
     p.id,
     r.name as role_name,
     r.permissions->>'can_manage_roles' as can_manage_roles
   FROM profiles p
   LEFT JOIN roles r ON p.role_id = r.id
   WHERE p.id = auth.uid();
   ```

2. If `can_manage_roles` is `false` or `null`, you need to:
   - Be assigned the "Org Admin" role, OR
   - Have a custom role with `can_manage_roles: true` in permissions

3. Check that the function was created:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'user_can_manage_roles';
   ```

4. Check that policies exist:
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'roles' 
   AND policyname LIKE '%can_manage_roles%';
   ```
