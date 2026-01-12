-- Check User Role Mismatch
-- Run this to see what role is actually assigned to your user in the database

-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- Or use this to check the current logged-in user:
SELECT 
  p.id as user_id,
  p.email,
  p.organization_id,
  p.role_id,
  r.id as role_table_id,
  r.name as role_name_in_db,
  r.is_system_role,
  r.permissions,
  o.name as organization_name
FROM public.profiles p
LEFT JOIN public.roles r ON p.role_id = r.id
LEFT JOIN public.organizations o ON p.organization_id = o.id
WHERE p.id = auth.uid();

-- Check all roles in your organization to see what's available
SELECT 
  id,
  name,
  is_system_role,
  organization_id,
  created_at
FROM public.roles
WHERE organization_id = (
  SELECT organization_id 
  FROM public.profiles 
  WHERE id = auth.uid()
)
ORDER BY name;

-- Check if there's a role named "Team" that might be incorrectly assigned
SELECT 
  r.id,
  r.name,
  r.is_system_role,
  COUNT(p.id) as users_with_this_role
FROM public.roles r
LEFT JOIN public.profiles p ON p.role_id = r.id
WHERE r.organization_id = (
  SELECT organization_id 
  FROM public.profiles 
  WHERE id = auth.uid()
)
GROUP BY r.id, r.name, r.is_system_role
ORDER BY r.name;
