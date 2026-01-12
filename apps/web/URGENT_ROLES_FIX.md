# 🚨 URGENT: Fix for Org Admins Not Being Recognized

## The Problem
After running the RLS fix script, org admins are no longer being recognized. This is because the SELECT policy on the roles table is too restrictive.

## Immediate Solution

**Run this script RIGHT NOW in Supabase SQL Editor:**
- File: `apps/web/scripts/fix-roles-rls-urgent.sql`

This script will:
1. ✅ Fix the SELECT policy to allow users to view ALL roles in their organization
2. ✅ Add the INSERT/UPDATE/DELETE policies for role management
3. ✅ Restore access so org admins are recognized again

## What This Fixes

### Before (Broken)
- Users could only see their own assigned role
- Org admins couldn't see other roles in their organization
- Role management was broken

### After (Fixed)
- Users can see ALL roles in their organization
- Users can see their own assigned role (even if org_id is missing)
- Org admins can manage roles again
- INSERT/UPDATE/DELETE policies are in place

## Quick Steps

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of `apps/web/scripts/fix-roles-rls-urgent.sql`
3. Paste and click **Run**
4. Verify the output shows 4 policies (SELECT, INSERT, UPDATE, DELETE)
5. Test in your app - org admins should be recognized again

## Verification

After running the script, verify with:

```sql
-- Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'roles';

-- Check if you can see roles in your org
SELECT COUNT(*) 
FROM roles 
WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());
```

You should see:
- 2 SELECT policies (authenticated + anon)
- 1 INSERT policy
- 1 UPDATE policy  
- 1 DELETE policy

## Why This Happened

The original SELECT policy used `user_can_view_role(id)` which checks each role individually. While this works for single role queries, it can be problematic for queries that list all roles in an organization. The new policy directly checks if the role's `organization_id` matches the user's organization, which is more reliable.
