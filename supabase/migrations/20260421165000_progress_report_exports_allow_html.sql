-- Allow HTML exports used by progress report email links.
-- Keep PDF for compatibility if server-side PDF uploads are introduced later.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['text/html', 'application/pdf']::text[]
WHERE id = 'progress_report_exports';
