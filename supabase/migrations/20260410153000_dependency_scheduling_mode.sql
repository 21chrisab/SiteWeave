ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS dependency_scheduling_mode TEXT NOT NULL DEFAULT 'auto'
CHECK (dependency_scheduling_mode IN ('auto', 'manual'));

UPDATE public.projects
SET dependency_scheduling_mode = 'auto'
WHERE dependency_scheduling_mode IS NULL;
