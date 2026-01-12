-- Fix Roles RLS Policy to Allow Users to Read Their Own Role
-- This fixes the 403 error when querying profiles with roles relationship
-- Users should be able to read their own role even if they don't have organization_id yet

-- Drop ALL existing SELECT policies on roles to start fresh
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

-- Create a new policy that allows:
-- 1. Users to read roles in their organization (existing behavior)
-- 2. Users to read their own assigned role (via profiles.role_id) - NEW
-- 3. Public access to roles for pending invitations (for invite pages)
CREATE POLICY "Users can view roles in their organization or their own role"
ON public.roles
FOR SELECT
USING (
  -- Users can read roles in their organization
  (organization_id IN (
    SELECT organization_id
    FROM public.profiles
    WHERE id = auth.uid()
    AND organization_id IS NOT NULL
  ))
  OR
  -- Users can always read their own assigned role (even if no organization_id yet)
  (auth.uid() IS NOT NULL 
   AND id IN (
     SELECT role_id
     FROM public.profiles
     WHERE id = auth.uid()
     AND role_id IS NOT NULL
   ))
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

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roles' 
    AND policyname = 'Users can view roles in their organization or their own role'
  ) THEN
    RAISE NOTICE 'Roles RLS policy updated successfully';
  ELSE
    RAISE EXCEPTION 'Failed to update roles RLS policy';
  END IF;
END $$;
