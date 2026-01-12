-- Debug script to check current RLS setup and test the helper function
-- Run this to see what's actually configured

-- Check if helper function exists and works
SELECT 
  'Helper function check' as test,
  user_can_view_role('cb244272-6435-477e-845b-c14c0ab8737f'::uuid) as result;

-- Check current roles policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'roles'
ORDER BY policyname;

-- Check if user can see their own role directly
SELECT id, name, organization_id 
FROM public.roles 
WHERE id = 'cb244272-6435-477e-845b-c14c0ab8737f'::uuid;

-- Test the problematic query that's failing
SELECT 
  organization_id,
  role_id,
  (SELECT row_to_json(r.*) FROM (
    SELECT id, name, permissions, is_system_role 
    FROM public.roles 
    WHERE id = 'cb244272-6435-477e-845b-c14c0ab8737f'::uuid
  ) r) as role_data
FROM public.profiles
WHERE id = auth.uid();
