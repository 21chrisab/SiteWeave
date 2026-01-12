-- Complete Fix for Roles RLS Policies (with debugging)
-- This script adds INSERT/UPDATE/DELETE policies for the roles table
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: Make sure you're logged in as a user with Org Admin role
-- or a role that has can_manage_roles permission when running this script

-- ============================================================================
-- STEP 1: CREATE/UPDATE HELPER FUNCTION
-- ============================================================================

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
  -- This allows initial setup where roles are being created for the first time
  IF user_role_id IS NULL THEN
    -- Count existing roles in the organization
    SELECT COUNT(*) INTO role_count
    FROM public.roles
    WHERE organization_id = check_organization_id;
    
    -- Allow if this is the first role being created (initial setup scenario)
    -- This is safe because the user is in the organization and creating the first role
    IF role_count = 0 THEN
      RETURN TRUE;
    END IF;
    
    -- Otherwise deny if no role assigned
    RETURN FALSE;
  END IF;

  -- Get role permissions (bypass RLS via SECURITY DEFINER)
  -- Note: This query bypasses RLS because the function is SECURITY DEFINER
  SELECT permissions INTO role_permissions
  FROM public.roles
  WHERE id = user_role_id;

  -- Check if can_manage_roles is true
  IF role_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN COALESCE((role_permissions->>'can_manage_roles')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: VERIFY FUNCTION WAS CREATED
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_can_manage_roles'
  ) THEN
    RAISE EXCEPTION 'Function user_can_manage_roles was not created!';
  ELSE
    RAISE NOTICE 'Function user_can_manage_roles created successfully';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Users with can_manage_roles can create roles" ON public.roles;
DROP POLICY IF EXISTS "Users with can_manage_roles can update roles" ON public.roles;
DROP POLICY IF EXISTS "Users with can_manage_roles can delete roles" ON public.roles;

-- ============================================================================
-- STEP 4: CREATE INSERT POLICY
-- ============================================================================

CREATE POLICY "Users with can_manage_roles can create roles"
ON public.roles
FOR INSERT
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Must have can_manage_roles permission for this organization
  user_can_manage_roles(organization_id)
);

-- ============================================================================
-- STEP 5: CREATE UPDATE POLICY
-- ============================================================================

CREATE POLICY "Users with can_manage_roles can update roles"
ON public.roles
FOR UPDATE
USING (
  -- Must have can_manage_roles permission for this organization
  user_can_manage_roles(organization_id)
)
WITH CHECK (
  -- Must have can_manage_roles permission for this organization
  user_can_manage_roles(organization_id)
);

-- ============================================================================
-- STEP 6: CREATE DELETE POLICY
-- ============================================================================

CREATE POLICY "Users with can_manage_roles can delete roles"
ON public.roles
FOR DELETE
USING (
  -- Must have can_manage_roles permission for this organization
  user_can_manage_roles(organization_id)
  AND
  -- Cannot delete system roles (safety check)
  is_system_role = false
);

-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Verifying policies were created...';
END $$;

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN '✅ INSERT policy exists'
    WHEN cmd = 'UPDATE' THEN '✅ UPDATE policy exists'
    WHEN cmd = 'DELETE' THEN '✅ DELETE policy exists'
    ELSE '✅ Policy exists'
  END as status
FROM pg_policies
WHERE tablename = 'roles'
  AND policyname LIKE '%can_manage_roles%'
ORDER BY policyname;

-- Test the function for current user (if get_user_organization_id exists)
DO $$
DECLARE
  user_org_id UUID;
  can_manage BOOLEAN;
BEGIN
  -- Try to get user's org ID
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF user_org_id IS NOT NULL THEN
    can_manage := user_can_manage_roles(user_org_id);
    RAISE NOTICE 'Current user can manage roles: %', can_manage;
    RAISE NOTICE 'User organization ID: %', user_org_id;
  ELSE
    RAISE NOTICE 'Current user has no organization_id';
  END IF;
END $$;
