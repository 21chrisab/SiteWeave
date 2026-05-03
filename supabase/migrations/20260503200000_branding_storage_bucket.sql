-- Public bucket for organization logos used in progress-report emails (getPublicUrl).
-- Paths: {organization_id}/logo.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

-- Anyone can read (email clients load logo by public URL without auth).
DROP POLICY IF EXISTS "Branding logos are publicly readable" ON storage.objects;
CREATE POLICY "Branding logos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding');

-- Authenticated users may write only under their org’s folder: {organization_id}/...
DROP POLICY IF EXISTS "Users can upload org branding logo" ON storage.objects;
CREATE POLICY "Users can upload org branding logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = (
    SELECT p.organization_id::text FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- Upsert/replace requires UPDATE + SELECT; scoped to same org folder.
DROP POLICY IF EXISTS "Users can update org branding logo" ON storage.objects;
CREATE POLICY "Users can update org branding logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = (
    SELECT p.organization_id::text FROM public.profiles p WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = (
    SELECT p.organization_id::text FROM public.profiles p WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete org branding logo" ON storage.objects;
CREATE POLICY "Users can delete org branding logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding'
  AND (storage.foldername(name))[1] = (
    SELECT p.organization_id::text FROM public.profiles p WHERE p.id = auth.uid()
  )
);
