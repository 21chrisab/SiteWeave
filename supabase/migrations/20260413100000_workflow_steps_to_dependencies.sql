-- Retire task workflow steps by materializing each legacy workflow step as a real task,
-- then chaining those tasks with finish-to-start dependencies. This migration is idempotent
-- because it only processes rows that still have workflow_steps populated.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS workflow_steps_legacy JSONB;

CREATE TEMP TABLE workflow_source_stage ON COMMIT DROP AS
SELECT
  t.*,
  CASE
    WHEN t.workflow_steps IS NULL THEN '[]'::jsonb
    WHEN jsonb_typeof(t.workflow_steps) = 'array' THEN t.workflow_steps
    WHEN jsonb_typeof(t.workflow_steps) = 'string'
      AND left(btrim(t.workflow_steps #>> '{}'), 1) = '['
      AND right(btrim(t.workflow_steps #>> '{}'), 1) = ']'
      THEN (t.workflow_steps #>> '{}')::jsonb
    ELSE '[]'::jsonb
  END AS workflow_steps_array
FROM public.tasks t;

CREATE TEMP TABLE workflow_step_stage ON COMMIT DROP AS
SELECT
  t.id AS workflow_task_id,
  t.project_id,
  t.organization_id,
  t.priority,
  t.project_phase_id,
  t.start_date,
  t.due_date,
  t.duration_days,
  t.is_milestone,
  t.text AS workflow_title,
  t.completed AS workflow_completed,
  COALESCE(t.current_workflow_step, 1) AS current_workflow_step,
  workflow.step_ordinal,
  workflow.step_item,
  CASE
    WHEN workflow.step_ordinal = 1 THEN t.id
    ELSE gen_random_uuid()
  END AS materialized_task_id,
  NULLIF(BTRIM(COALESCE(workflow.step_item ->> 'description', '')), '') AS step_description,
  CASE
    WHEN COALESCE(workflow.step_item ->> 'assigned_to_contact_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (workflow.step_item ->> 'assigned_to_contact_id')::uuid
    ELSE NULL
  END AS assigned_contact_id
FROM workflow_source_stage t
CROSS JOIN LATERAL jsonb_array_elements(t.workflow_steps_array) WITH ORDINALITY AS workflow(step_item, step_ordinal)
WHERE jsonb_array_length(t.workflow_steps_array) > 0;

UPDATE public.tasks AS task_row
SET
  workflow_steps_legacy = COALESCE(task_row.workflow_steps_legacy, task_row.workflow_steps),
  text = CASE
    WHEN step_row.step_description IS NULL THEN step_row.workflow_title
    WHEN lower(step_row.step_description) = lower(step_row.workflow_title) THEN step_row.workflow_title
    ELSE step_row.workflow_title || ' - ' || step_row.step_description
  END,
  assignee_id = CASE
    WHEN step_row.assigned_contact_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.contacts contact_row WHERE contact_row.id = step_row.assigned_contact_id)
      THEN step_row.assigned_contact_id
    ELSE NULL
  END,
  completed = step_row.workflow_completed OR step_row.current_workflow_step > 1,
  percent_complete = CASE
    WHEN step_row.workflow_completed OR step_row.current_workflow_step > 1 THEN 100
    ELSE 0
  END,
  workflow_steps = NULL,
  current_workflow_step = NULL
FROM workflow_step_stage AS step_row
WHERE step_row.step_ordinal = 1
  AND task_row.id = step_row.workflow_task_id;

INSERT INTO public.tasks (
  id,
  project_id,
  organization_id,
  text,
  due_date,
  priority,
  completed,
  assignee_id,
  start_date,
  duration_days,
  is_milestone,
  percent_complete,
  project_phase_id
)
SELECT
  step_row.materialized_task_id,
  step_row.project_id,
  step_row.organization_id,
  CASE
    WHEN step_row.step_description IS NULL THEN step_row.workflow_title || ' - Step ' || step_row.step_ordinal::text
    WHEN lower(step_row.step_description) = lower(step_row.workflow_title) THEN step_row.workflow_title
    ELSE step_row.workflow_title || ' - ' || step_row.step_description
  END,
  step_row.due_date,
  step_row.priority,
  step_row.workflow_completed OR step_row.current_workflow_step > step_row.step_ordinal,
  CASE
    WHEN step_row.assigned_contact_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.contacts contact_row WHERE contact_row.id = step_row.assigned_contact_id)
      THEN step_row.assigned_contact_id
    ELSE NULL
  END,
  step_row.start_date,
  step_row.duration_days,
  step_row.is_milestone,
  CASE
    WHEN step_row.workflow_completed OR step_row.current_workflow_step > step_row.step_ordinal THEN 100
    ELSE 0
  END,
  step_row.project_phase_id
FROM workflow_step_stage AS step_row
WHERE step_row.step_ordinal > 1;

INSERT INTO public.task_dependencies (
  task_id,
  successor_task_id,
  dependency_type,
  lag_days
)
SELECT
  previous_step.materialized_task_id,
  next_step.materialized_task_id,
  'finish_to_start',
  0
FROM workflow_step_stage AS previous_step
JOIN workflow_step_stage AS next_step
  ON next_step.workflow_task_id = previous_step.workflow_task_id
 AND next_step.step_ordinal = previous_step.step_ordinal + 1
WHERE previous_step.materialized_task_id <> next_step.materialized_task_id
ON CONFLICT (task_id, successor_task_id) DO NOTHING;

UPDATE public.tasks
SET
  workflow_steps_legacy = COALESCE(workflow_steps_legacy, workflow_steps),
  workflow_steps = NULL,
  current_workflow_step = NULL
WHERE workflow_steps IS NOT NULL
   OR current_workflow_step IS NOT NULL;

COMMENT ON COLUMN public.tasks.workflow_steps IS 'Deprecated: legacy workflow JSON migrated to task_dependencies.';
COMMENT ON COLUMN public.tasks.current_workflow_step IS 'Deprecated: legacy workflow pointer no longer used.';
COMMENT ON COLUMN public.tasks.workflow_steps_legacy IS 'Read-only archive of deprecated workflow steps captured during migration.';
