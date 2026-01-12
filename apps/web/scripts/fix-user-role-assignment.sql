-- Fix User Role Assignment
-- Use this to assign the correct "Org Admin" role to a user
-- 
-- IMPORTANT: Replace 'USER_ID_HERE' with the actual user ID
-- You can find your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Step 1: Find the Org Admin role ID for your organization
DO $$
DECLARE
  user_org_id UUID;
  org_admin_role_id UUID;
  user_id_to_fix UUID := 'USER_ID_HERE'::UUID; -- REPLACE THIS
BEGIN
  -- Get user's organization
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = user_id_to_fix;
  
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization_id';
  END IF;
  
  -- Find Org Admin role
  SELECT id INTO org_admin_role_id
  FROM public.roles
  WHERE organization_id = user_org_id
  AND name = 'Org Admin'
  AND is_system_role = true;
  
  IF org_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Org Admin role not found for this organization';
  END IF;
  
  -- Update user's role
  UPDATE public.profiles
  SET role_id = org_admin_role_id
  WHERE id = user_id_to_fix;
  
  RAISE NOTICE 'User role updated to Org Admin (role_id: %)', org_admin_role_id;
END $$;

-- Alternative: Fix for current logged-in user
DO $$
DECLARE
  user_org_id UUID;
  org_admin_role_id UUID;
BEGIN
  -- Get current user's organization
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'Current user has no organization_id';
  END IF;
  
  -- Find Org Admin role
  SELECT id INTO org_admin_role_id
  FROM public.roles
  WHERE organization_id = user_org_id
  AND name = 'Org Admin'
  AND is_system_role = true;
  
  IF org_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Org Admin role not found for this organization';
  END IF;
  
  -- Update current user's role
  UPDATE public.profiles
  SET role_id = org_admin_role_id
  WHERE id = auth.uid();
  
  RAISE NOTICE 'Current user role updated to Org Admin (role_id: %)', org_admin_role_id;
END $$;
