-- Complete Fix for Organizations RLS Policy
-- This ensures authenticated users can read their organizations
-- while still allowing public access for invitation pages

-- Step 0: Ensure RLS is enabled on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Step 1: Drop ALL existing policies that might be blocking access
-- This ensures we start fresh
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', r.policyname);
  END LOOP;
END $$;

-- Step 2: Create a comprehensive policy that allows:
-- - Authenticated users to read organizations they belong to
-- - Public (unauthenticated) users to read organization names for pending invitations
CREATE POLICY "Users can read their organizations or public can read for invitations"
ON public.organizations
FOR SELECT
USING (
  -- Authenticated users can read organizations they belong to
  (auth.uid() IS NOT NULL 
   AND id IN (
     SELECT organization_id 
     FROM public.profiles 
     WHERE id = auth.uid() 
     AND organization_id IS NOT NULL
   ))
  OR
  -- Public (unauthenticated) users can read organization names for pending invitations
  (auth.uid() IS NULL 
   AND id IN (
     SELECT organization_id 
     FROM public.invitations 
     WHERE status = 'pending' 
     AND invitation_token IS NOT NULL
   ))
);

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'Users can read their organizations or public can read for invitations'
  ) THEN
    RAISE NOTICE 'Organizations RLS policy created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create organizations RLS policy';
  END IF;
END $$;
