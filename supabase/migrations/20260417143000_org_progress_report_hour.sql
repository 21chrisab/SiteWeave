ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS progress_report_send_hour INTEGER NOT NULL DEFAULT 8;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS progress_report_timezone TEXT NOT NULL DEFAULT 'America/New_York';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_progress_report_send_hour_range'
  ) THEN
    ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_progress_report_send_hour_range
    CHECK (progress_report_send_hour >= 0 AND progress_report_send_hour <= 23);
  END IF;
END $$;
