-- Link tasks to project phases and roll up phase progress from binary task completion.
-- Phases with no linked tasks continue to use date-based schedule progress.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS project_phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_phase_id ON public.tasks(project_id, project_phase_id)
WHERE project_phase_id IS NOT NULL;

COMMENT ON COLUMN public.tasks.project_phase_id IS 'Optional project phase; when set, phase progress is derived from completed/total tasks for that phase.';

-- Ensure task belongs to the same project as the phase
CREATE OR REPLACE FUNCTION public.tasks_validate_project_phase_same_project()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.project_phase_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.project_phases pp
    WHERE pp.id = NEW.project_phase_id
      AND pp.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'tasks.project_phase_id must reference a phase on the same project';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_validate_project_phase ON public.tasks;
CREATE TRIGGER trg_tasks_validate_project_phase
BEFORE INSERT OR UPDATE OF project_id, project_phase_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.tasks_validate_project_phase_same_project();

-- Single source: recompute project_phases.progress from tasks if any, else from dates
CREATE OR REPLACE FUNCTION public.recompute_project_phase_progress(p_phase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_done int;
  v_start date;
  v_end date;
  v_progress int;
BEGIN
  IF p_phase_id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*)::int, count(*) FILTER (WHERE t.completed = true)::int
  INTO v_total, v_done
  FROM public.tasks t
  WHERE t.project_phase_id = p_phase_id;

  IF v_total > 0 THEN
    v_progress := ROUND((100.0 * v_done) / v_total)::int;
    v_progress := GREATEST(0, LEAST(100, v_progress));
  ELSE
    SELECT pp.start_date, pp.end_date
    INTO v_start, v_end
    FROM public.project_phases pp
    WHERE pp.id = p_phase_id;

    IF v_start IS NULL OR v_end IS NULL THEN
      v_progress := 0;
    ELSE
      v_progress := public.calculate_project_phase_schedule_progress(v_start, v_end, CURRENT_DATE);
    END IF;
  END IF;

  UPDATE public.project_phases
  SET progress = v_progress,
      updated_at = now()
  WHERE id = p_phase_id;
END;
$$;

-- When phase dates change: if phase has tasks, rollup from tasks; else schedule-based
CREATE OR REPLACE FUNCTION public.set_project_phase_schedule_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  task_count int;
  v_progress int;
BEGIN
  SELECT count(*)::int INTO task_count
  FROM public.tasks
  WHERE project_phase_id = NEW.id;

  IF task_count > 0 THEN
    SELECT ROUND((100.0 * count(*) FILTER (WHERE completed)) / NULLIF(count(*), 0))::int
    INTO v_progress
    FROM public.tasks
    WHERE project_phase_id = NEW.id;
    NEW.progress := GREATEST(0, LEAST(100, COALESCE(v_progress, 0)));
    RETURN NEW;
  END IF;

  IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.progress := public.calculate_project_phase_schedule_progress(
    NEW.start_date,
    NEW.end_date,
    CURRENT_DATE
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tasks_after_change_refresh_phase_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  op text := TG_OP;
BEGIN
  IF op = 'DELETE' THEN
    IF OLD.project_phase_id IS NOT NULL THEN
      PERFORM public.recompute_project_phase_progress(OLD.project_phase_id);
    END IF;
    RETURN OLD;
  END IF;

  IF op = 'UPDATE' AND OLD.project_phase_id IS DISTINCT FROM NEW.project_phase_id THEN
    IF OLD.project_phase_id IS NOT NULL THEN
      PERFORM public.recompute_project_phase_progress(OLD.project_phase_id);
    END IF;
  END IF;

  IF op IN ('INSERT', 'UPDATE') AND NEW.project_phase_id IS NOT NULL THEN
    PERFORM public.recompute_project_phase_progress(NEW.project_phase_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_refresh_phase_progress ON public.tasks;
CREATE TRIGGER trg_tasks_refresh_phase_progress
AFTER INSERT OR DELETE OR UPDATE OF completed, project_phase_id, project_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.tasks_after_change_refresh_phase_progress();
