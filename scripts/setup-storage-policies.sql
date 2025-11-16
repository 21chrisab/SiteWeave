-- ============================================================================
-- STORAGE POLICIES SETUP SCRIPT
-- Run this script in your Supabase SQL Editor after creating storage buckets
-- ============================================================================

-- ============================================================================
-- message_files BUCKET POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload message files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read message files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read message files" ON storage.objects;

-- Allow authenticated users to upload files to message_files bucket
CREATE POLICY "Users can upload message files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message_files');

-- Allow authenticated users to read files from message_files bucket
CREATE POLICY "Users can read message files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message_files');

-- Allow public read access (only if bucket is set to public)
-- Comment out this policy if your bucket is private
CREATE POLICY "Public can read message files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message_files');

-- Allow authenticated users to delete files from message_files bucket
CREATE POLICY "Users can delete their own message files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message_files');

-- ============================================================================
-- files BUCKET POLICIES (if you're using it)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project files" ON storage.objects;

-- Allow authenticated users to upload files to files bucket
CREATE POLICY "Users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

-- Allow authenticated users to read files from files bucket
CREATE POLICY "Users can read project files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'files');

-- Allow authenticated users to delete files from files bucket
CREATE POLICY "Users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'files');

