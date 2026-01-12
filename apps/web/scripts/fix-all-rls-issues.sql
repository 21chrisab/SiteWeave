-- Complete RLS Fix - Run this in Supabase SQL Editor
-- This fixes both roles and organizations 403 errors
-- Uses SECURITY DEFINER helper functions to bypass RLS on subqueries

-- ============================================================================
-- STEP 1: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Helper function to check if user can view a specific role
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
    (user_org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.roles 
      WHERE id = check_role_id 
      AND organization_id = user_org_id
    ))
    OR
    (user_role_id IS NOT NULL AND check_role_id = user_role_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user can view a specific organization
CREATE OR REPLACE FUNCTION user_can_view_organization(check_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get user's organization_id (bypasses RLS via SECURITY DEFINER)
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- User can view organization if it's their own organization
  RETURN (user_org_id IS NOT NULL AND user_org_id = check_org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 2: FIX ROLES RLS POLICIES
-- ============================================================================

-- Drop all existing roles SELECT policies
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

-- Create new roles SELECT policy using helper function
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

-- ============================================================================
-- STEP 3: FIX ORGANIZATIONS RLS POLICIES
-- ============================================================================

-- Drop all existing organizations policies
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', r.policyname);
  END LOOP;
END $$;

-- Users can view their own organization
CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (
  -- Use helper function to check access (bypasses RLS via SECURITY DEFINER)
  user_can_view_organization(id)
);

-- Admins can update their organization
CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
  id = get_user_organization_id()
  AND is_user_admin()
);

-- Only super admins can create organizations
CREATE POLICY "Only super admins can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  )
);

-- Only super admins can delete organizations
CREATE POLICY "Only super admins can delete organizations"
ON public.organizations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  )
);

-- ============================================================================
-- STEP 4: VERIFY ALL POLICIES WERE CREATED
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('roles', 'organizations')
ORDER BY tablename, policyname;

-- Expected results:
-- roles: 1 SELECT policy
-- organizations: 4 policies (SELECT, UPDATE, INSERT, DELETE)
