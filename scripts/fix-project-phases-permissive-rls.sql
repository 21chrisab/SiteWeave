-- Fix project_phases permissive RLS (Supabase linter 0024).
-- Run this on the live DB if the linter reports "RLS policy always true" for project_phases.
-- It drops the permissive policy names that the linter reports and recreates the correct policies from schema.sql.

-- Drop permissive policies if they exist (exact names reported by linter)
DROP POLICY IF EXISTS "Users can view project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Users can delete project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Users can insert project phases" ON public.project_phases;
DROP POLICY IF EXISTS "Users can update project phases" ON public.project_phases;

-- Ensure the correct policies exist (idempotent: drop first then create)
DROP POLICY IF EXISTS "Users can see phases for projects they have access to" ON public.project_phases;
DROP POLICY IF EXISTS "Users can create phases for accessible projects" ON public.project_phases;
DROP POLICY IF EXISTS "Users can update phases for accessible projects" ON public.project_phases;
DROP POLICY IF EXISTS "Users can delete phases for accessible projects" ON public.project_phases;

CREATE POLICY "Users can see phases for projects they have access to"
ON public.project_phases FOR SELECT
USING (project_id IN (SELECT id FROM public.projects));

CREATE POLICY "Users can create phases for accessible projects"
ON public.project_phases FOR INSERT
WITH CHECK (project_id IN (SELECT id FROM public.projects));

CREATE POLICY "Users can update phases for accessible projects"
ON public.project_phases FOR UPDATE
USING (project_id IN (SELECT id FROM public.projects));

CREATE POLICY "Users can delete phases for accessible projects"
ON public.project_phases FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE project_manager_id = (select auth.uid()) OR (select get_user_role()) = 'Admin' OR created_by_user_id = (select auth.uid())
  )
);
