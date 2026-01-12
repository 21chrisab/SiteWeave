-- Quick Fix for Organizations RLS Policy - Run this in Supabase SQL Editor
-- This fixes the 403 error when querying organizations

-- Step 1: Create helper function to check if user can view an organization
CREATE OR REPLACE FUNCTION user_can_view_organization(check_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get user's organization_id (bypasses RLS via SECURITY DEFINER)
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- User can view organization if it's their own organization
  RETURN (user_org_id IS NOT NULL AND user_org_id = check_org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop all existing organizations policies
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', r.policyname);
  END LOOP;
END $$;

-- Step 3: Users can view their own organization
CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (
  -- Use helper function to check access (bypasses RLS via SECURITY DEFINER)
  user_can_view_organization(id)
);

-- Admins can update their organization
CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
  id = get_user_organization_id()
  AND is_user_admin()
);

-- Only super admins can create organizations
CREATE POLICY "Only super admins can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  )
);

-- Only super admins can delete organizations
CREATE POLICY "Only super admins can delete organizations"
ON public.organizations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  )
);

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;
