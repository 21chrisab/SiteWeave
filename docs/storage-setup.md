# Storage Bucket Setup Guide

This guide explains how to set up the required Supabase Storage buckets for SiteWeave.

## Source Of Truth

Use the versioned SQL in `supabase/migrations/20260407130000_add_task_photos.sql` as the canonical storage-policy setup for task photos, and use `scripts/setup-storage-policies.sql` if you need a manual SQL editor script for local environments. The older simplified bucket-only policy examples below are no longer sufficient for private task photo access.

## Required Buckets

### 1. `message_files` Bucket
Used for storing files uploaded in message channels.

**Setup Steps:**
1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Enter bucket name: `message_files`
5. Choose bucket visibility:
   - **Public bucket**: Check this if you want files to be publicly accessible via URL
   - **Private bucket**: Uncheck if you want files to be private (requires authentication)
6. Click **Create bucket**

**Recommended Settings:**
- **Public bucket**: ✅ Enabled (for easy file sharing in messages)
- **File size limit**: 50MB (or adjust based on your needs)
- **Allowed MIME types**: Leave empty to allow all types, or specify: `image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*`

### 2. `files` Bucket (if not already created)
Used for general project file storage.

**Setup Steps:**
Same as above, but use bucket name: `files`

### 3. `task_photos` Bucket
Used for private task photo originals and thumbnails.

**Recommended Settings:**
- **Public bucket**: Disabled
- **File size limit**: 5MB
- **Allowed MIME types**: `image/jpeg,image/png,image/webp`

## Storage Policies

After creating the buckets, you **MUST** set up storage policies to control access. Run this SQL in your Supabase SQL Editor:

```sql
-- ============================================================================
-- STORAGE POLICIES FOR message_files BUCKET
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

-- If bucket is public, also allow public read access
CREATE POLICY "Public can read message files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message_files');

-- Allow users to delete their own files (optional)
CREATE POLICY "Users can delete their own message files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message_files');
```

**Important Notes:**
- If your bucket is **public**, you need the "Public can read message files" policy
- If your bucket is **private**, remove the public read policy
- The delete policy allows any authenticated user to delete files (you can make it more restrictive if needed)

## Verification

To verify your buckets are set up correctly:

1. Go to **Storage** in Supabase Dashboard
2. You should see both `message_files` and `files` buckets listed
3. Try uploading a test file through the application

## Troubleshooting

### Error: "Bucket not found"
- Ensure the bucket name matches exactly (case-sensitive)
- Check that the bucket was created successfully in the dashboard
- Verify you're using the correct Supabase project

### Error: "new row violates row-level security policy"
- Set up storage policies as shown above
- Ensure your user is authenticated
- Check that the policy conditions match your use case

### Files not accessible
- If using public bucket, ensure "Public bucket" is enabled
- If using private bucket, ensure proper storage policies are in place
- Check file path and bucket name in your code

## Task photos: storage cleanup when rows are deleted

The app deletes storage objects when users remove photos through the UI. If a `task_photos` row is removed **without** that path (for example `tasks` deleted with `ON DELETE CASCADE` from SQL or an integration), files can remain in the `task_photos` bucket.

1. Deploy the Edge Function `cleanup-task-photo-storage` (`supabase/functions/cleanup-task-photo-storage`).
2. In the Supabase Dashboard, open **Database → Webhooks** and create a webhook:
   - **Table**: `public.task_photos`
   - **Events**: `DELETE`
   - **HTTP Request**: `POST` to `https://<project-ref>.supabase.co/functions/v1/cleanup-task-photo-storage`
   - **HTTP Headers**: `Authorization: Bearer <SERVICE_ROLE_KEY>` (use the service role secret; do not expose it to browsers)
   - **Payload**: default JSON body is fine; the function accepts either `{ "bucket", "paths" }` or Supabase webhook payloads with `old_record` containing `storage_bucket`, `storage_path`, and `thumbnail_path`.

The handler removes both the original and thumbnail paths from Storage. Duplicate deletes (e.g. after the app already removed the files) are harmless.

