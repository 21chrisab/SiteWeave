-- Quick Fix for Roles RLS Policy - Run this in Supabase SQL Editor
-- This fixes the 403 error when querying profiles with roles relationship

-- Step 1: Create helper function to check if user can view a role
CREATE OR REPLACE FUNCTION user_can_view_role(check_role_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
  user_role_id UUID;
BEGIN
  -- Get user's organization_id and role_id (bypasses RLS via SECURITY DEFINER)
  SELECT organization_id, role_id INTO user_org_id, user_role_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- User can view role if:
  -- 1. Role is in their organization
  -- 2. Role is their own assigned role
  RETURN (
    -- Check if role is in user's organization
    (user_org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.roles 
      WHERE id = check_role_id 
      AND organization_id = user_org_id
    ))
    OR
    -- Check if role is user's assigned role
    (user_role_id IS NOT NULL AND check_role_id = user_role_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop all existing roles SELECT policies
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roles'
    AND cmd = 'SELECT'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.roles', r.policyname);
  END LOOP;
END $$;

-- Step 3: Create new roles SELECT policy
CREATE POLICY "Users can view roles in their organization or their own role"
ON public.roles
FOR SELECT
USING (
  -- Use helper function to check access (bypasses RLS via SECURITY DEFINER)
  user_can_view_role(id)
  OR
  -- Public (unauthenticated) users can read roles for pending invitations
  (auth.uid() IS NULL 
   AND id IN (
     SELECT role_id 
     FROM public.invitations 
     WHERE status = 'pending' 
     AND invitation_token IS NOT NULL
     AND role_id IS NOT NULL
   ))
);

-- Step 4: Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'roles'
ORDER BY policyname;
