-- Fix project_contacts INSERT RLS policy to allow project creators to add any contacts
-- This fixes the 403 error when creating projects and adding contacts

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins and PMs can assign contacts to projects" ON public.project_contacts;

-- Create updated policy that allows:
-- 1. Admins to assign any contact to any project
-- 2. PMs to assign contacts to their own projects (where project_manager_id = auth.uid())
-- 3. Project creators to add any contacts to projects they created (not just themselves)
CREATE POLICY "Admins and PMs can assign contacts to projects"
ON public.project_contacts
FOR INSERT
WITH CHECK (
  (get_user_role() = 'Admin')
  OR
  (project_id IN (
    SELECT id FROM public.projects 
    WHERE project_manager_id = auth.uid()
  ))
  OR
  -- Allow project creators to add any contacts to projects they created
  (project_id IN (
    SELECT id FROM public.projects 
    WHERE created_by_user_id = auth.uid()
  ))
);
