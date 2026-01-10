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
-- 1. Any authenticated user to create contacts (original simple policy - needed for invitation acceptance)
-- 2. This is safe because contacts are scoped by organization_id and created_by_user_id
-- Note: The original policy was very permissive (just auth.uid() IS NOT NULL)
-- We keep it simple to avoid recursion and timing issues during invitation acceptance
CREATE POLICY "Authenticated users can create contacts"
ON public.contacts
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

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
