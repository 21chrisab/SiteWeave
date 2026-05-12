-- Idempotent task indexes for org-wide / project-scoped list queries (RLS-friendly).
-- Sources: scripts/add-performance-indexes.sql, scripts/add-missing-indexes.sql, scripts/optimize-existing-indexes.sql (tasks only).

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_project_completed ON public.tasks(project_id, completed);
CREATE INDEX IF NOT EXISTS idx_tasks_org_completed ON public.tasks(organization_id, completed);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'due_date'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_org_completed_due_date
      ON public.tasks(organization_id, completed, due_date)
      WHERE due_date IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_pending
  ON public.tasks(project_id, assignee_id, due_date)
  WHERE completed = false;

CREATE INDEX IF NOT EXISTS idx_tasks_overdue
  ON public.tasks(organization_id, due_date)
  WHERE completed = false AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_org_project_completed_assignee
  ON public.tasks(organization_id, project_id, completed, assignee_id)
  WHERE assignee_id IS NOT NULL;
