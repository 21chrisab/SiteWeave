-- Fix Project Access Issues
-- This script fixes multiple issues with project access and team member detection
-- 1. Auto-adds project creators to project_contacts
-- 2. Fixes admin role detection to work with both old and new role systems
-- 3. Ensures organization_id is properly handled

-- ============================================================================
-- STEP 1: UPDATE HELPER FUNCTIONS TO HANDLE BOTH ROLE SYSTEMS
-- ============================================================================

-- Fix get_user_role() to handle both old TEXT role and new role_id system
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    -- Try new role_id system first
    (SELECT r.name 
     FROM public.profiles p
     LEFT JOIN public.roles r ON p.role_id = r.id
     WHERE p.id = auth.uid()),
    -- Fallback to old TEXT role field
    (SELECT role::TEXT 
     FROM public.profiles 
     WHERE id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper to check if user is admin (checks both is_super_admin flag and role name)
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  ) OR get_user_role() = 'Admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 2: CREATE TRIGGER TO AUTO-ADD PROJECT CREATORS
-- ============================================================================

-- Function to automatically add project creator to project_contacts
CREATE OR REPLACE FUNCTION auto_add_project_creator()
RETURNS TRIGGER AS $$
DECLARE
  creator_contact_id UUID;
  project_org_id UUID;
BEGIN
  -- Get creator's contact_id from their profile
  SELECT contact_id INTO creator_contact_id
  FROM public.profiles
  WHERE id = NEW.created_by_user_id;
  
  -- Get project's organization_id (it's in NEW since we just inserted it)
  project_org_id := NEW.organization_id;
  
  -- Auto-add creator to project_contacts if contact_id exists and org_id is set
  IF creator_contact_id IS NOT NULL AND project_org_id IS NOT NULL THEN
    INSERT INTO public.project_contacts (project_id, contact_id, organization_id)
    VALUES (NEW.id, creator_contact_id, project_org_id)
    ON CONFLICT (project_id, contact_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after project insertion
DROP TRIGGER IF EXISTS trigger_auto_add_project_creator ON public.projects;

CREATE TRIGGER trigger_auto_add_project_creator
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION auto_add_project_creator();

-- ============================================================================
-- STEP 3: UPDATE PROJECTS RLS POLICY TO USE is_user_admin()
-- ============================================================================

-- Drop ALL existing projects SELECT policies (comprehensive cleanup)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'projects' 
      AND schemaname = 'public'
      AND cmd = 'SELECT'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', r.policyname);
  END LOOP;
END $$;

-- Recreate with improved admin detection
CREATE POLICY "Users can see projects in their organization"
ON public.projects
FOR SELECT
USING (
  -- CRITICAL: Must be in same organization
  organization_id = get_user_organization_id()
  AND (
    -- Admin can see ALL projects in their org (even if not explicitly added)
    is_user_admin()
    OR
    -- PMs see their assigned projects
    (project_manager_id = auth.uid())
    OR
    -- Creators see projects they created
    (created_by_user_id = auth.uid())
    OR
    -- Team members see projects they're linked to via project_contacts
    (id IN (
      SELECT project_id
      FROM public.project_contacts
      WHERE contact_id = get_user_contact_id()
        AND organization_id = get_user_organization_id()
    ))
    OR
    -- Guest collaborators see projects they're invited to
    (id IN (
      SELECT project_id
      FROM public.project_collaborators
      WHERE user_id = auth.uid()
    ))
  )
);

-- ============================================================================
-- STEP 4: UPDATE PROJECT_CONTACTS INSERT POLICY TO ALLOW ADMINS
-- ============================================================================

-- Drop ALL existing project_contacts INSERT policies (comprehensive cleanup)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'project_contacts' 
      AND schemaname = 'public'
      AND cmd = 'INSERT'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_contacts', r.policyname);
  END LOOP;
END $$;

-- Recreate with improved admin detection and allow admins to add any contact in their org
CREATE POLICY "Admins and PMs can assign contacts in their organization"
ON public.project_contacts
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id()
  AND (
    -- Admins can add any contact in their organization
    (is_user_admin() AND contact_id IN (
      SELECT id FROM public.contacts 
      WHERE organization_id = get_user_organization_id()
    ))
    OR
    -- PMs can add contacts to their projects
    (project_id IN (
      SELECT id FROM public.projects
      WHERE project_manager_id = auth.uid()
        AND organization_id = get_user_organization_id()
    ))
    OR
    -- Users can add themselves to projects they created
    (project_id IN (
      SELECT id FROM public.projects
      WHERE created_by_user_id = auth.uid()
        AND organization_id = get_user_organization_id()
    ) AND contact_id = get_user_contact_id())
  )
);

-- ============================================================================
-- STEP 5: ADD COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_user_role() IS 'Returns the role name of the current user. Handles both old TEXT role field and new role_id system.';
COMMENT ON FUNCTION is_user_admin() IS 'Returns true if the current user is an admin. Checks both is_super_admin flag and role name.';
COMMENT ON FUNCTION auto_add_project_creator() IS 'Automatically adds the project creator to project_contacts when a project is created. Ensures creators always have access to their projects.';
COMMENT ON TRIGGER trigger_auto_add_project_creator ON public.projects IS 'Automatically adds project creator to project_contacts after project creation.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- 1. ✅ get_user_role() now handles both old TEXT role and new role_id system
-- 2. ✅ is_user_admin() checks both is_super_admin flag and role name
-- 3. ✅ Auto-add trigger ensures creators are always in project_contacts
-- 4. ✅ Projects SELECT policy uses is_user_admin() for better admin detection
-- 5. ✅ Project_contacts INSERT policy allows admins to add any contact in their org
