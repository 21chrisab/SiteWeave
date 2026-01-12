-- Diagnostic Script for Roles RLS Issues
-- Run this to check if policies and functions are set up correctly

-- ============================================================================
-- 1. Check if user_can_manage_roles function exists
-- ============================================================================
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'user_can_manage_roles';

-- ============================================================================
-- 2. Check existing RLS policies on roles table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'roles'
ORDER BY policyname;

-- ============================================================================
-- 3. Check current user's role and permissions
-- ============================================================================
SELECT 
  p.id as user_id,
  p.organization_id,
  p.role_id,
  r.name as role_name,
  r.permissions,
  r.is_system_role,
  (r.permissions->>'can_manage_roles')::boolean as can_manage_roles
FROM public.profiles p
LEFT JOIN public.roles r ON p.role_id = r.id
WHERE p.id = auth.uid();

-- ============================================================================
-- 4. Test user_can_manage_roles function for current user
-- ============================================================================
SELECT 
  get_user_organization_id() as user_org_id,
  user_can_manage_roles(get_user_organization_id()) as can_manage_roles_result;

-- ============================================================================
-- 5. Check if RLS is enabled on roles table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'roles' AND schemaname = 'public';
