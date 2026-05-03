-- Baseline project start for schedule timeline vitals (used with due_date as the calendar window).

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS start_date DATE;

COMMENT ON COLUMN public.projects.start_date IS 'Planned project start (baseline); with due_date defines the schedule window for progress report day X of Y.';
