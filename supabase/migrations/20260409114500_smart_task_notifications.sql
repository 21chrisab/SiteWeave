ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS task_start_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS task_start_notification_lead_days INTEGER[] NOT NULL DEFAULT ARRAY[14, 7];

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS task_notifications_use_org_defaults BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS task_start_notifications_enabled BOOLEAN,
ADD COLUMN IF NOT EXISTS task_start_notification_lead_days INTEGER[];

CREATE TABLE IF NOT EXISTS public.task_notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    lead_days INTEGER NOT NULL,
    notification_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'skipped', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(task_id, lead_days, notification_date)
);

CREATE INDEX IF NOT EXISTS idx_task_notification_history_org_date
ON public.task_notification_history(organization_id, notification_date DESC);

CREATE INDEX IF NOT EXISTS idx_task_notification_history_task
ON public.task_notification_history(task_id, notification_date DESC);

