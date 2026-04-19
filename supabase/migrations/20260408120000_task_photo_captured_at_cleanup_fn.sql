-- Capture-time metadata (EXIF DateTimeOriginal) and docs reference for storage cleanup webhook.

ALTER TABLE public.task_photos
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;

COMMENT ON COLUMN public.task_photos.captured_at IS
  'When the photo was taken (from EXIF DateTimeOriginal/CreateDate when available), not upload time. GPS is not stored; client strips location by re-encoding.';

CREATE INDEX IF NOT EXISTS idx_task_photos_captured_at
  ON public.task_photos (captured_at)
  WHERE captured_at IS NOT NULL;
