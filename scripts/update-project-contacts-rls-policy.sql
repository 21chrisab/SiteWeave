-- Update project_contacts RLS policy to allow users to add themselves to projects they created
-- This ensures creators can see their projects even if they're Team members

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins and PMs can assign contacts to projects" ON public.project_contacts;

-- Create updated policy that allows:
-- 1. Admins to assign any contact to any project
-- 2. PMs to assign contacts to their own projects
-- 3. Users to add themselves to projects they created
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
  -- Allow users to add themselves to projects they created
  (project_id IN (
    SELECT id FROM public.projects 
    WHERE created_by_user_id = auth.uid()
  ) AND contact_id = get_user_contact_id())
);

