-- URGENT FIX: Restore Roles Access and Add INSERT/UPDATE/DELETE Policies
-- This fixes the issue where org admins aren't being recognized
-- Run this IMMEDIATELY in Supabase SQL Editor

-- ============================================================================
-- STEP 1: CREATE/UPDATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can view a role
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

-- Function to check if user can manage roles
CREATE OR REPLACE FUNCTION user_can_manage_roles(check_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
  user_role_id UUID;
  role_permissions JSONB;
  role_count INTEGER;
BEGIN
  -- Get user's organization_id
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Must be in the same organization
  IF user_org_id IS NULL OR user_org_id != check_organization_id THEN
    RETURN FALSE;
  END IF;

  -- Get user's role_id
  SELECT role_id INTO user_role_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- Special case: If user has no role assigned, check if they're creating the first role
  IF user_role_id IS NULL THEN
    SELECT COUNT(*) INTO role_count
    FROM public.roles
    WHERE organization_id = check_organization_id;
    
    IF role_count = 0 THEN
      RETURN TRUE;
    END IF;
    
    RETURN FALSE;
  END IF;

  -- Get role permissions (bypass RLS via SECURITY DEFINER)
  SELECT permissions INTO role_permissions
  FROM public.roles
  WHERE id = user_role_id;

  IF role_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN COALESCE((role_permissions->>'can_manage_roles')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: FIX SELECT POLICY - Allow users to view ALL roles in their organization
-- ============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their role" ON public.roles;
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.roles;
DROP POLICY IF EXISTS "Users can view roles in their organization or their own role" ON public.roles;

-- Create a comprehensive SELECT policy that allows:
-- 1. Users to view ALL roles in their organization
-- 2. Users to view their own assigned role (even if org_id is missing)
-- 3. Public access for pending invitations
CREATE POLICY "Users can view roles in their organization"
ON public.roles
FOR SELECT
TO authenticated
USING (
  -- Users can view ALL roles in their organization
  organization_id IN (
    SELECT organization_id
    FROM public.profiles
    WHERE id = auth.uid()
    AND organization_id IS NOT NULL
  )
  OR
  -- Users can always view their own assigned role
  (id IN (
    SELECT role_id
    FROM public.profiles
    WHERE id = auth.uid()
    AND role_id IS NOT NULL
  ))
);

-- Public (unauthenticated) users can read roles for pending invitations
DROP POLICY IF EXISTS "Public can view roles for invitations" ON public.roles;

CREATE POLICY "Public can view roles for invitations"
ON public.roles
FOR SELECT
TO anon
USING (
  id IN (
    SELECT role_id 
    FROM public.invitations 
    WHERE status = 'pending' 
    AND invitation_token IS NOT NULL
    AND role_id IS NOT NULL
  )
);

-- ============================================================================
-- STEP 3: ADD INSERT/UPDATE/DELETE POLICIES
-- ============================================================================

-- Drop existing INSERT/UPDATE/DELETE policies if they exist
DROP POLICY IF EXISTS "Users with can_manage_roles can create roles" ON public.roles;
DROP POLICY IF EXISTS "Users with can_manage_roles can update roles" ON public.roles;
DROP POLICY IF EXISTS "Users with can_manage_roles can delete roles" ON public.roles;

-- INSERT Policy: Users with can_manage_roles permission can create roles
CREATE POLICY "Users with can_manage_roles can create roles"
ON public.roles
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  user_can_manage_roles(organization_id)
);

-- UPDATE Policy: Users with can_manage_roles permission can update roles
CREATE POLICY "Users with can_manage_roles can update roles"
ON public.roles
FOR UPDATE
USING (
  user_can_manage_roles(organization_id)
)
WITH CHECK (
  user_can_manage_roles(organization_id)
);

-- DELETE Policy: Users with can_manage_roles permission can delete roles
CREATE POLICY "Users with can_manage_roles can delete roles"
ON public.roles
FOR DELETE
USING (
  user_can_manage_roles(organization_id)
  AND
  is_system_role = false
);

-- ============================================================================
-- STEP 4: VERIFICATION
-- ============================================================================

-- Verify all policies exist
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Users can view roles'
    WHEN cmd = 'INSERT' THEN '✅ Users can create roles'
    WHEN cmd = 'UPDATE' THEN '✅ Users can update roles'
    WHEN cmd = 'DELETE' THEN '✅ Users can delete roles'
  END as status
FROM pg_policies
WHERE tablename = 'roles'
ORDER BY cmd, policyname;

-- Test: Check if current user can see roles in their organization
DO $$
DECLARE
  user_org_id UUID;
  role_count INTEGER;
BEGIN
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF user_org_id IS NOT NULL THEN
    SELECT COUNT(*) INTO role_count
    FROM public.roles
    WHERE organization_id = user_org_id;
    
    RAISE NOTICE 'User organization ID: %', user_org_id;
    RAISE NOTICE 'Roles in organization: %', role_count;
    RAISE NOTICE 'User can manage roles: %', user_can_manage_roles(user_org_id);
  ELSE
    RAISE NOTICE 'WARNING: Current user has no organization_id!';
  END IF;
END $$;
