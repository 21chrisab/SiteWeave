-- Fix Invitations RLS Policy for Public Access
-- This allows unauthenticated users to read invitations by token
-- This is needed for the web app invite acceptance flow

-- Drop ALL existing SELECT policies on invitations to start fresh
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'invitations'
    AND cmd = 'SELECT'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invitations', r.policyname);
  END LOOP;
END $$;

-- Create a new policy that allows:
-- 1. Public access to pending invitations by token (for invite acceptance)
-- 2. Authenticated users can see invitations they sent or received
CREATE POLICY "Public can read pending invitations by token, users can see their invitations"
ON public.invitations
FOR SELECT
USING (
  -- Allow public access to pending invitations (for invite acceptance page)
  (status = 'pending' AND invitation_token IS NOT NULL)
  OR
  -- Authenticated users can see invitations they sent
  (auth.uid() IS NOT NULL AND invited_by_user_id = auth.uid())
  OR
  -- Authenticated users can see invitations sent to their email
  -- Use profiles table instead of auth.users to avoid permission issues
  (auth.uid() IS NOT NULL AND email IN (
    SELECT c.email 
    FROM public.profiles p
    JOIN public.contacts c ON p.contact_id = c.id
    WHERE p.id = auth.uid()
  ))
);

-- Also need to allow public access to organizations table for the invite page
-- Note: This will be handled by fix-organizations-rls-complete.sql
-- So we don't create it here to avoid conflicts

-- Also need to allow public access to roles table for the invite page
-- Note: This will be handled by fix-roles-rls-for-profile-query.sql
-- So we don't create it here to avoid conflicts
