-- ============================================================================
-- STORAGE POLICIES SETUP SCRIPT
-- Run this script in your Supabase SQL Editor after creating storage buckets
-- Updated for Multi-Tenant B2B Architecture with Organization and Guest Access
-- ============================================================================

-- Helper function to check if user has access to file via organization or project collaboration
-- Note: This assumes file paths include organization_id or project_id
-- Example path structure: {organization_id}/{project_id}/filename.ext
CREATE OR REPLACE FUNCTION has_storage_file_access(file_path TEXT, bucket_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  path_parts TEXT[];
  org_id UUID;
  project_id UUID;
BEGIN
  -- Parse file path to extract organization_id and project_id
  -- Expected format: {organization_id}/{project_id}/filename.ext or {organization_id}/filename.ext
  path_parts := string_to_array(file_path, '/');
  
  -- Try to extract organization_id from path (first segment)
  IF array_length(path_parts, 1) >= 1 THEN
    BEGIN
      org_id := path_parts[1]::UUID;
    EXCEPTION WHEN OTHERS THEN
      org_id := NULL;
    END;
  END IF;
  
  -- Try to extract project_id from path (second segment, if exists)
  IF array_length(path_parts, 1) >= 2 THEN
    BEGIN
      project_id := path_parts[2]::UUID;
    EXCEPTION WHEN OTHERS THEN
      project_id := NULL;
    END;
  END IF;
  
  -- Check if user is organization member
  IF org_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND organization_id = org_id
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Check if user is project collaborator (guest access)
  IF project_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.project_collaborators
      WHERE project_id = project_id AND user_id = auth.uid()
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- message_files BUCKET POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload message files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read message files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read message files" ON storage.objects;

-- Allow authenticated users to upload files to message_files bucket (organization members only)
CREATE POLICY "Users can upload message files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message_files'
  AND has_storage_file_access(name, 'message_files')
);

-- Allow authenticated users to read files from message_files bucket (org members OR project collaborators)
CREATE POLICY "Users can read message files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message_files'
  AND has_storage_file_access(name, 'message_files')
);

-- Allow authenticated users to delete files from message_files bucket
-- Organization admins or file owners can delete
CREATE POLICY "Users can delete message files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message_files'
  AND (
    has_storage_file_access(name, 'message_files')
    OR
    (storage.foldername(name))[1] IN (
      SELECT organization_id::TEXT FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- ============================================================================
-- files BUCKET POLICIES (if you're using it)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project files" ON storage.objects;

-- Allow authenticated users to upload files to files bucket (organization members OR project collaborators with editor/admin access)
CREATE POLICY "Users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files'
  AND has_storage_file_access(name, 'files')
);

-- Allow authenticated users to read files from files bucket (org members OR project collaborators)
CREATE POLICY "Users can read project files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'files'
  AND has_storage_file_access(name, 'files')
);

-- Allow authenticated users to delete files from files bucket
-- Organization admins or project collaborators with admin access can delete
CREATE POLICY "Users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'files'
  AND (
    has_storage_file_access(name, 'files')
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.permissions->>'can_delete_projects' = 'true'
        AND (storage.foldername(name))[1] = p.organization_id::TEXT
    )
  )
);

