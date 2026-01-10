-- Complete Fix for Organizations RLS Policy
-- This ensures authenticated users can read their organizations
-- while still allowing public access for invitation pages

-- Step 1: Drop any existing restrictive policies that might be blocking access
DROP POLICY IF EXISTS "Public can read organization names for invitations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can read their organizations" ON public.organizations;

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
