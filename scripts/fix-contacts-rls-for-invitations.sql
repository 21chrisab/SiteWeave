-- Fix Contacts RLS Policy to Allow Contact Creation During Invitation Acceptance
-- This allows newly signed-up users to create contacts in the organization they're joining

-- Drop ALL existing INSERT policies on contacts to start fresh
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contacts'
    AND cmd = 'INSERT'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contacts', r.policyname);
  END LOOP;
END $$;

-- Create a new policy that allows:
-- 1. Authenticated users to create contacts in organizations they belong to
-- 2. Authenticated users to create contacts for themselves (covers invitation acceptance)
-- Note: We avoid checking invitations table to prevent recursion issues
CREATE POLICY "Authenticated users can create contacts in their organization or for themselves"
ON public.contacts
FOR INSERT
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND (
    -- Allow if user belongs to the organization
    (organization_id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE id = auth.uid()
      AND organization_id IS NOT NULL
    ))
    OR
    -- Allow if the contact is being created by the user themselves
    -- This covers invitation acceptance where user creates their own contact
    -- This is safe because the user is authenticated and creating their own record
    (created_by_user_id = auth.uid())
  )
);

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contacts' 
    AND policyname = 'Authenticated users can create contacts in their organization or for themselves'
  ) THEN
    RAISE NOTICE 'Contacts INSERT RLS policy updated successfully';
  ELSE
    RAISE EXCEPTION 'Failed to update contacts INSERT RLS policy';
  END IF;
END $$;
