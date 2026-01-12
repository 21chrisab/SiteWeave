# Roles and Permissions Fix Summary

## Issues Fixed

### 1. ✅ Fixed `getUserRole` Error (PGRST116)
**Problem:** The function was using `.single()` which expects exactly one row, but failed when:
- User has no `role_id` set (NULL)
- User's `role_id` points to a role that doesn't exist
- RLS blocks access to the role

**Solution:** Updated `getUserRole` to:
- First check if the user has a `role_id` using `maybeSingle()`
- Return `null` gracefully if no profile or no `role_id`
- Fetch role details separately to avoid join issues
- Use `maybeSingle()` instead of `single()` to handle missing roles

**Files Updated:**
- `apps/web/src/utils/permissions.js`
- `src/utils/permissions.js`

### 2. ✅ Added Missing RLS Policies for Roles Table
**Problem:** The roles table only had SELECT policies, but no INSERT/UPDATE/DELETE policies. This caused:
- Error 42501: "new row violates row-level security policy for table \"roles\""
- Users with `can_manage_roles` permission couldn't create/update/delete roles

**Solution:** Created SQL script with:
- `user_can_manage_roles()` helper function (SECURITY DEFINER)
- INSERT policy: Users with `can_manage_roles` can create roles
- UPDATE policy: Users with `can_manage_roles` can update roles
- DELETE policy: Users with `can_manage_roles` can delete roles (system roles protected)

**File Created:**
- `apps/web/scripts/fix-roles-rls-complete.sql`

**Action Required:** Run this SQL script in Supabase SQL Editor

### 3. ✅ Added "Project Manager" as System Role
**Problem:** Only "Org Admin" and "Member" were created as system roles when an organization is created.

**Solution:** Added "Project Manager" role creation in `create-org-admin` function with permissions:
- ✅ Can create/edit projects (not delete)
- ✅ Can view financials and reports
- ✅ Can assign tasks
- ✅ Can manage contacts
- ✅ Can create/edit/delete tasks
- ❌ Cannot manage team/users/roles

**Files Updated:**
- `apps/web/supabase/functions/create-org-admin/index.ts`
- `supabase/functions/create-org-admin/index.ts`

## Next Steps

1. **Run the SQL script** in Supabase SQL Editor:
   ```sql
   -- Run: apps/web/scripts/fix-roles-rls-complete.sql
   ```
   This will add the INSERT/UPDATE/DELETE policies for the roles table.

2. **Test the fixes:**
   - Try using the Project Manager role - it should now work
   - Try creating a new role - it should work if you have `can_manage_roles` permission
   - Check that `getUserRole` no longer throws errors for users without roles

3. **For existing organizations:**
   - The "Project Manager" role will be automatically created for new organizations
   - For existing organizations, you may want to create the role manually or run a migration script

## Testing Checklist

- [ ] Run `fix-roles-rls-complete.sql` in Supabase
- [ ] Test Project Manager role assignment
- [ ] Test role creation (should work for Org Admins)
- [ ] Test role updates (should work for Org Admins)
- [ ] Verify `getUserRole` doesn't throw errors for users without roles
- [ ] Verify new organizations get Project Manager role automatically
