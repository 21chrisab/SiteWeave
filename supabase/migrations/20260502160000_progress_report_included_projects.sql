-- Org-level progress reports: optional subset of projects to include (NULL = all org projects).
ALTER TABLE public.progress_report_schedules
  ADD COLUMN IF NOT EXISTS included_project_ids UUID[] DEFAULT NULL;

COMMENT ON COLUMN public.progress_report_schedules.included_project_ids IS
  'When project_id is NULL (organization report), optional subset of project UUIDs; NULL means include all org projects.';
