-- Simplified Roles RLS Fix
-- This uses a simpler approach that should work with Supabase's JOIN evaluation

-- Step 1: Create or replace the helper function
CREATE OR REPLACE FUNCTION user_can_view_role(check_role_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
  user_role_id UUID;
BEGIN
  -- Get user's organization_id and role_id (bypasses RLS via SECURITY DEFINER)
  SELECT organization_id, role_id INTO user_org_id, user_role_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Allow if:
  -- 1. Role is in user's organization
  -- 2. Role is user's assigned role
  RETURN (
    (user_org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.roles 
      WHERE id = check_role_id 
      AND organization_id = user_org_id
    ))
    OR
    (user_role_id IS NOT NULL AND check_role_id = user_role_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop ALL existing roles policies (not just SELECT)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'roles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.roles', r.policyname);
  END LOOP;
END $$;

-- Step 3: Create a permissive SELECT policy
CREATE POLICY "Users can view their role"
ON public.roles
FOR SELECT
TO authenticated
USING (user_can_view_role(id));

-- Step 4: Create a simple public read policy for unauthenticated users (invitations)
CREATE POLICY "Public can view roles for invitations"
ON public.roles
FOR SELECT
TO anon
USING (
  id IN (
    SELECT role_id 
    FROM public.invitations 
    WHERE status = 'pending' 
    AND invitation_token IS NOT NULL
    AND role_id IS NOT NULL
  )
);

-- Step 5: Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles as applies_to
FROM pg_policies
WHERE tablename = 'roles'
ORDER BY policyname;
