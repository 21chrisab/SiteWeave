-- Fix Project Contacts RLS Policy
-- This allows project creators to add ANY contact from their organization to projects they created
-- Previously, creators could only add themselves

-- Drop ALL existing project_contacts policies to avoid conflicts
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_contacts' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.project_contacts', r.policyname);
  END LOOP;
END $$;

-- Project contacts SELECT - only for projects in their org
CREATE POLICY "Users can see project contacts in their organization"
ON public.project_contacts
FOR SELECT
USING (
  organization_id = get_user_organization_id()
);

-- Project contacts INSERT - must be in same org
-- Admins can add any contact in their organization
-- PMs can add contacts to their managed projects
-- Project creators can add any contact in their org to projects they created
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
    -- PMs can add contacts to their managed projects
    (project_id IN (
      SELECT id FROM public.projects
      WHERE project_manager_id = auth.uid()
        AND organization_id = get_user_organization_id()
    ))
    OR
    -- Project creators can add any contact in their org to projects they created
    (project_id IN (
      SELECT id FROM public.projects
      WHERE created_by_user_id = auth.uid()
        AND organization_id = get_user_organization_id()
    ) AND contact_id IN (
      SELECT id FROM public.contacts
      WHERE organization_id = get_user_organization_id()
    ))
  )
);

-- Project contacts UPDATE
CREATE POLICY "Admins and PMs can update project contacts in their organization"
ON public.project_contacts
FOR UPDATE
USING (
  organization_id = get_user_organization_id()
  AND (
    is_user_admin()
    OR
    (project_id IN (
      SELECT id FROM public.projects
      WHERE project_manager_id = auth.uid()
        AND organization_id = get_user_organization_id()
    ))
  )
);

-- Project contacts DELETE
CREATE POLICY "Admins and PMs can remove project contacts in their organization"
ON public.project_contacts
FOR DELETE
USING (
  organization_id = get_user_organization_id()
  AND (
    is_user_admin()
    OR
    (project_id IN (
      SELECT id FROM public.projects
      WHERE project_manager_id = auth.uid()
        AND organization_id = get_user_organization_id()
    ))
  )
);

