-- Fix Projects DELETE RLS Policy to use multi-tenant permission system
-- This allows users with can_delete_projects permission to delete projects
-- Also allows project creators to delete their own projects

-- ============================================================================
-- HELPER FUNCTION: Check if user has can_delete_projects permission
-- ============================================================================

CREATE OR REPLACE FUNCTION user_can_delete_projects(check_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
  user_role_id UUID;
  role_permissions JSONB;
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

  -- If user has no role assigned, deny
  IF user_role_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get role permissions (bypass RLS via SECURITY DEFINER)
  SELECT permissions INTO role_permissions
  FROM public.roles
  WHERE id = user_role_id;

  -- Check if can_delete_projects is true
  IF role_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN COALESCE((role_permissions->>'can_delete_projects')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE PROJECTS DELETE RLS POLICY
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins, PMs, and creators can delete projects" ON public.projects;

-- Create updated policy that allows:
-- 1. Users with can_delete_projects permission in the same organization
-- 2. Project creators (created_by_user_id = auth.uid())
-- 3. Project managers (project_manager_id = auth.uid()) - for backwards compatibility
-- 4. Users with old 'Admin' role (for backwards compatibility during migration)
CREATE POLICY "Users with can_delete_projects permission or creators can delete projects"
ON public.projects
FOR DELETE
USING (
  -- Check permission-based access (multi-tenant B2B system)
  (
    organization_id IS NOT NULL 
    AND user_can_delete_projects(organization_id)
  )
  OR
  -- Allow project creators to delete their own projects
  (created_by_user_id = auth.uid())
  OR
  -- Allow project managers to delete their projects (backwards compatibility)
  (project_manager_id = auth.uid())
  OR
  -- Allow old Admin role (backwards compatibility during migration)
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'projects' 
  AND cmd = 'DELETE'
ORDER BY policyname;
