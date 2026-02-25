-- Migration: Task Dependencies & Schedule (Gantt MVP)
-- Adds task_dependencies table and start_date, duration_days, is_milestone to tasks.
-- No financial, billing, or time-tracking fields.
-- RLS scoped via tasks (organization_id / project_id).

-- ============================================================================
-- 1. ALTER TASKS TABLE (new columns for schedule/Gantt)
-- ============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false;

COMMENT ON COLUMN tasks.start_date IS 'Schedule start for Gantt; used with due_date for duration';
COMMENT ON COLUMN tasks.duration_days IS 'Working days duration (optional, can be derived from start_date/due_date)';
COMMENT ON COLUMN tasks.is_milestone IS 'Zero-duration milestone task for Gantt';

-- ============================================================================
-- 2. TASK_DEPENDENCIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'finish_to_start'
        CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT task_dependencies_no_self CHECK (task_id != successor_task_id),
    CONSTRAINT task_dependencies_unique UNIQUE (task_id, successor_task_id)
);

COMMENT ON TABLE task_dependencies IS 'Predecessor/successor links for Gantt and critical path; task_id = predecessor, successor_task_id = successor';

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor_task_id ON task_dependencies(successor_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date) WHERE start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_is_milestone ON tasks(is_milestone) WHERE is_milestone = true;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (task_dependencies)
-- ============================================================================

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Users see dependencies only when they can see both tasks (tasks RLS applies)
CREATE POLICY "Users can see task dependencies for tasks they can see"
ON task_dependencies FOR SELECT
USING (
    task_id IN (SELECT id FROM public.tasks)
    AND successor_task_id IN (SELECT id FROM public.tasks)
);

CREATE POLICY "Users can create task dependencies for tasks they can update"
ON task_dependencies FOR INSERT
WITH CHECK (
    task_id IN (SELECT id FROM public.tasks)
    AND successor_task_id IN (SELECT id FROM public.tasks)
);

CREATE POLICY "Users can update task dependencies for tasks they can update"
ON task_dependencies FOR UPDATE
USING (
    task_id IN (SELECT id FROM public.tasks)
    AND successor_task_id IN (SELECT id FROM public.tasks)
);

CREATE POLICY "Users can delete task dependencies for tasks they can update"
ON task_dependencies FOR DELETE
USING (
    task_id IN (SELECT id FROM public.tasks)
    AND successor_task_id IN (SELECT id FROM public.tasks)
);
