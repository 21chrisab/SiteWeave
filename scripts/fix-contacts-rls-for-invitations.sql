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
    -- Allow if there's a pending invitation for this organization
    -- We check if the user's profile email (via contacts) matches an invitation
    -- OR if the contact being created matches an invitation email
    (organization_id IN (
      SELECT organization_id
      FROM public.invitations
      WHERE status = 'pending'
      AND invitation_token IS NOT NULL
      AND (
        -- Check if invitation email matches the contact email being created
        email = contacts.email
        OR
        -- Check if invitation email matches user's contact email
        email IN (
          SELECT c.email
          FROM public.profiles p
          JOIN public.contacts c ON p.contact_id = c.id
          WHERE p.id = auth.uid()
        )
      )
    ))
    OR
    -- Allow if the contact is being created by the user themselves (created_by_user_id matches)
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
    AND policyname = 'Authenticated users can create contacts in their organization or for invitations'
  ) THEN
    RAISE NOTICE 'Contacts INSERT RLS policy updated successfully';
  ELSE
    RAISE EXCEPTION 'Failed to update contacts INSERT RLS policy';
  END IF;
END $$;
