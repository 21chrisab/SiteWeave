ALTER TABLE public.project_phases
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_project_phases_date_order') THEN
        ALTER TABLE public.project_phases
        ADD CONSTRAINT ck_project_phases_date_order CHECK (
            start_date IS NULL
            OR end_date IS NULL
            OR end_date >= start_date
        );
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.calculate_project_phase_schedule_progress(
    phase_start_date DATE,
    phase_end_date DATE,
    as_of DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    total_days INTEGER;
    elapsed_days INTEGER;
BEGIN
    IF phase_start_date IS NULL OR phase_end_date IS NULL THEN
        RETURN 0;
    END IF;

    IF as_of < phase_start_date THEN
        RETURN 0;
    END IF;

    IF as_of >= phase_end_date THEN
        RETURN 100;
    END IF;

    total_days := phase_end_date - phase_start_date;
    IF total_days <= 0 THEN
        RETURN 100;
    END IF;

    elapsed_days := as_of - phase_start_date;
    RETURN GREATEST(0, LEAST(100, ROUND((elapsed_days::NUMERIC * 100) / total_days)::INTEGER));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_phase_schedule_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_set_project_phase_schedule_progress ON public.project_phases;
CREATE TRIGGER trg_set_project_phase_schedule_progress
BEFORE INSERT OR UPDATE OF start_date, end_date ON public.project_phases
FOR EACH ROW
EXECUTE FUNCTION public.set_project_phase_schedule_progress();

