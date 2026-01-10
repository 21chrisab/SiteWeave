-- Fix Invitations RLS Policy for Public Access
-- This allows unauthenticated users to read invitations by token
-- This is needed for the web app invite acceptance flow

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can see invitations they sent or received" ON public.invitations;

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
-- This policy is ADDITIVE - it doesn't replace existing policies, it adds to them
-- Authenticated users should still be able to read their organizations via existing policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'Public can read organization names for invitations'
  ) THEN
    CREATE POLICY "Public can read organization names for invitations"
    ON public.organizations
    FOR SELECT
    USING (
      -- Allow reading organization name if there's a pending invitation for it
      -- This is for unauthenticated users viewing invite pages
      id IN (
        SELECT organization_id 
        FROM public.invitations 
        WHERE status = 'pending' 
        AND invitation_token IS NOT NULL
      )
    );
  END IF;
END $$;

-- Also need to allow public access to roles table for the invite page
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roles' 
    AND policyname = 'Public can read role names for invitations'
  ) THEN
    CREATE POLICY "Public can read role names for invitations"
    ON public.roles
    FOR SELECT
    USING (
      -- Allow reading role name if there's a pending invitation with this role
      id IN (
        SELECT role_id 
        FROM public.invitations 
        WHERE status = 'pending' 
        AND invitation_token IS NOT NULL
        AND role_id IS NOT NULL
      )
    );
  END IF;
END $$;
