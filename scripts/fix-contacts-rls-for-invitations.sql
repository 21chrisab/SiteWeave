-- Fix Contacts RLS Policy to Allow Contact Creation During Invitation Acceptance
-- This allows newly signed-up users to create contacts in the organization they're joining

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.contacts;

-- Create a new policy that allows:
-- 1. Authenticated users to create contacts (existing behavior)
-- 2. Users to create contacts in organizations they belong to
-- 3. Users to create contacts in organizations they're being invited to (via pending invitation)
CREATE POLICY "Authenticated users can create contacts in their organization or for invitations"
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
    (created_by_user_id = auth.uid())
    OR
    -- Allow if there's a pending invitation for this contact's email to this organization
    -- In WITH CHECK, reference columns directly (not table.column)
    EXISTS (
      SELECT 1
      FROM public.invitations
      WHERE invitations.organization_id = organization_id
      AND LOWER(invitations.email) = LOWER(email)
      AND invitations.status = 'pending'
      AND invitations.invitation_token IS NOT NULL
    )
  )
);

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contacts' 
    AND policyname = 'Authenticated users can create contacts in their organization or for invitations'
  ) THEN
    RAISE NOTICE 'Contacts INSERT RLS policy updated successfully';
  ELSE
    RAISE EXCEPTION 'Failed to update contacts INSERT RLS policy';
  END IF;
END $$;
