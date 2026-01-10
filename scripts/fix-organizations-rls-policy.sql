-- Fix Organizations RLS Policy
-- This ensures authenticated users can read their organizations
-- while still allowing public access for invitation pages

-- First, check if there's an existing policy that might be blocking access
-- If organizations table doesn't have a SELECT policy for authenticated users, add one

DO $$
BEGIN
  -- Check if there's already a policy for authenticated users to read their organizations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'Authenticated users can read their organizations'
  ) THEN
    -- Create policy for authenticated users to read organizations they belong to
    CREATE POLICY "Authenticated users can read their organizations"
    ON public.organizations
    FOR SELECT
    USING (
      -- Users can read organizations they belong to (via profiles.organization_id)
      auth.uid() IS NOT NULL 
      AND id IN (
        SELECT organization_id 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND organization_id IS NOT NULL
      )
    );
  END IF;
END $$;

-- The public policy for invitations should already exist from the previous script
-- This policy is additive and won't interfere with authenticated user access
