-- ============================================================================
-- RLS ACCESS VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to test if a specific user can see their
-- assigned rows. Replace the UUIDs below with real values from your database.
-- ============================================================================

-- ============================================================================
-- STEP 1: Find a real user to test with
-- ============================================================================
-- This query shows all users, their auth.uid(), contact_id, role, and organization
SELECT 
  p.id AS auth_user_id,
  p.role AS legacy_role,
  r.name AS role_name,
  p.contact_id,
  c.name AS contact_name,
  c.email AS contact_email,
  p.organization_id,
  o.name AS organization_name
FROM profiles p
LEFT JOIN contacts c ON p.contact_id = c.id
LEFT JOIN roles r ON p.role_id = r.id
LEFT JOIN organizations o ON p.organization_id = o.id
ORDER BY p.created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 2: Check what tasks are assigned to a specific contact
-- ============================================================================
-- Replace 'YOUR_CONTACT_ID' with the contact_id from Step 1
-- This runs as service_role (bypasses RLS) to show ground truth
SELECT 
  t.id AS task_id,
  t.text AS task_text,
  t.project_id,
  t.assignee_id,
  t.organization_id,
  t.completed,
  c.name AS assigned_to_contact_name,
  p.name AS project_name
FROM tasks t
LEFT JOIN contacts c ON t.assignee_id = c.id
LEFT JOIN projects p ON t.project_id = p.id
WHERE t.assignee_id = 'YOUR_CONTACT_ID'  -- <-- Replace this
ORDER BY t.created_at DESC;

-- ============================================================================
-- STEP 3: Check if the user is linked to the project via project_contacts
-- ============================================================================
-- This is the critical link. If this returns 0 rows, the user can't see the project.
-- Replace both UUIDs below.
SELECT 
  pc.project_id,
  pc.contact_id,
  pc.organization_id,
  p.name AS project_name,
  c.name AS contact_name
FROM project_contacts pc
JOIN projects p ON pc.project_id = p.id
JOIN contacts c ON pc.contact_id = c.id
WHERE pc.contact_id = 'YOUR_CONTACT_ID';  -- <-- Replace this

-- ============================================================================
-- STEP 4: Impersonate a user and test RLS
-- ============================================================================
-- This simulates what a specific user would see through RLS.
-- Replace 'YOUR_AUTH_USER_ID' with the user's auth.uid() (profiles.id)

-- 4a. Set the JWT claims to impersonate the user
SELECT set_config('request.jwt.claims', json_build_object(
  'sub', 'YOUR_AUTH_USER_ID',  -- <-- Replace with auth.uid()
  'role', 'authenticated',
  'iss', 'supabase',
  'iat', extract(epoch from now())::int,
  'exp', extract(epoch from (now() + interval '1 hour'))::int
)::text, true);

-- Also set the role to authenticated (required for RLS to kick in)
SET ROLE authenticated;

-- 4b. Now query as the impersonated user — RLS applies!
-- This shows what projects the user can see:
SELECT id, name, status, organization_id, project_manager_id, created_by_user_id
FROM projects
ORDER BY created_at DESC;

-- 4c. This shows what tasks the user can see:
SELECT t.id, t.text, t.assignee_id, t.project_id, t.completed, t.organization_id
FROM tasks t
ORDER BY t.created_at DESC;

-- 4d. Check if the user can see tasks assigned to their contact_id:
-- (Replace 'YOUR_CONTACT_ID' with the user's contact_id)
SELECT t.id, t.text, t.assignee_id, t.project_id, t.completed
FROM tasks t
WHERE t.assignee_id = 'YOUR_CONTACT_ID';  -- <-- Replace this

-- 4e. Check project_collaborators access (this was broken before the fix):
SELECT * FROM project_collaborators;

-- ============================================================================
-- STEP 5: Reset role back to normal (IMPORTANT!)
-- ============================================================================
RESET ROLE;

-- ============================================================================
-- STEP 6: Diagnostic — find users who are assigned to tasks but NOT in project_contacts
-- ============================================================================
-- These are users who would be invisible due to the RLS gap (before Fix #5)
SELECT DISTINCT
  t.assignee_id AS contact_id,
  c.name AS contact_name,
  c.email AS contact_email,
  t.project_id,
  p.name AS project_name,
  CASE 
    WHEN pc.contact_id IS NOT NULL THEN 'YES - Has project access'
    ELSE 'NO - MISSING from project_contacts (BUG!)'
  END AS has_project_contact_link
FROM tasks t
JOIN contacts c ON t.assignee_id = c.id
JOIN projects p ON t.project_id = p.id
LEFT JOIN project_contacts pc ON pc.project_id = t.project_id AND pc.contact_id = t.assignee_id
WHERE t.assignee_id IS NOT NULL
ORDER BY has_project_contact_link DESC, c.name;

-- ============================================================================
-- STEP 7: Auto-fix — Add missing project_contacts for assigned task users
-- ============================================================================
-- UNCOMMENT the INSERT below to fix all missing links automatically.
-- This ensures every user assigned to a task can see the project.

-- INSERT INTO project_contacts (project_id, contact_id, organization_id)
-- SELECT DISTINCT t.project_id, t.assignee_id, t.organization_id
-- FROM tasks t
-- WHERE t.assignee_id IS NOT NULL
--   AND t.project_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM project_contacts pc
--     WHERE pc.project_id = t.project_id
--       AND pc.contact_id = t.assignee_id
--   )
-- ON CONFLICT (project_id, contact_id) DO NOTHING;

-- ============================================================================
-- STEP 8: Verify RLS policies exist for all tables with RLS enabled
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Compare with tables that have RLS enabled:
SELECT 
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COALESCE(p.policy_count, 0) AS policy_count,
  CASE 
    WHEN c.relrowsecurity AND COALESCE(p.policy_count, 0) = 0 
    THEN 'DANGER: RLS enabled but NO policies (denies ALL access)'
    WHEN c.relrowsecurity AND COALESCE(p.policy_count, 0) > 0 
    THEN 'OK'
    ELSE 'No RLS'
  END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (
  SELECT tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
ORDER BY status DESC, c.relname;
