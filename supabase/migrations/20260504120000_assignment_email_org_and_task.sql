-- Org default: pre-check "Send email notification" on new tasks (TaskModal).
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS default_send_assignment_email BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.default_send_assignment_email IS
  'When true, new task form pre-checks Send email notification for assignees with an email.';

-- Per-task: user chose to request immediate assignment email on create (auditable intent).
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS notify_assignee_email BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tasks.notify_assignee_email IS
  'If true, creator opted in to send immediate assignment email for this task on create.';
