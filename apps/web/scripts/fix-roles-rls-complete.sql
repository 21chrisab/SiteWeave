-- Complete Fix for Roles RLS Policies
-- This script adds INSERT/UPDATE/DELETE policies for the roles table
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: Make sure you're logged in as a user with Org Admin role
-- or a role that has can_manage_roles permission when running this script

-- ============================================================================
-- HELPER FUNCTION: Check if user has can_manage_roles permission
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
-- ADD INSERT/UPDATE/DELETE POLICIES FOR ROLES TABLE
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
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Must have can_manage_roles permission for this organization
  user_can_manage_roles(organization_id)
);

-- UPDATE Policy: Users with can_manage_roles permission can update roles
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

-- DELETE Policy: Users with can_manage_roles permission can delete roles
-- Note: System roles cannot be deleted (enforced by application logic)
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
-- VERIFICATION
-- ============================================================================

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'roles'
ORDER BY policyname;
