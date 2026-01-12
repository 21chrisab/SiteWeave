-- Comprehensive Fix: Project Team Assignment Issues
-- Run this script in Supabase SQL Editor to fix all project team issues

-- ============================================================================
-- STEP 1: Fix Missing organization_id in project_contacts
-- ============================================================================
UPDATE project_contacts pc
SET organization_id = p.organization_id
FROM projects p
WHERE pc.project_id = p.id
  AND (pc.organization_id IS NULL OR pc.organization_id != p.organization_id);

SELECT 'Fixed project_contacts organization_id' as step, COUNT(*) as affected
FROM project_contacts;

-- ============================================================================
-- STEP 2: Ensure all users have a contact record
-- ============================================================================
-- Create contacts for profiles that don't have one
INSERT INTO contacts (name, email, type, role, status, organization_id)
SELECT 
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1)
  ) as name,
  au.email,
  'Team' as type,
  'Team Member' as role,
  'Available' as status,
  p.organization_id
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.contact_id IS NULL
  AND au.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c WHERE LOWER(c.email) = LOWER(au.email)
  )
ON CONFLICT DO NOTHING;

SELECT 'Created missing contacts' as step, COUNT(*) as total_contacts
FROM contacts;

-- ============================================================================
-- STEP 3: Link contacts to profiles
-- ============================================================================
UPDATE profiles p
SET contact_id = c.id
FROM contacts c
JOIN auth.users au ON LOWER(au.email) = LOWER(c.email)
WHERE p.id = au.id
  AND p.contact_id IS NULL;

SELECT 'Linked contacts to profiles' as step, COUNT(*) as profiles_with_contacts
FROM profiles WHERE contact_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Add project creators to project_contacts
-- ============================================================================
INSERT INTO project_contacts (project_id, contact_id, organization_id, role)
SELECT 
  p.id as project_id,
  prof.contact_id,
  p.organization_id,
  'Owner' as role
FROM projects p
JOIN profiles prof ON prof.id = p.created_by_user_id
WHERE prof.contact_id IS NOT NULL
  AND p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM project_contacts pc 
    WHERE pc.project_id = p.id 
      AND pc.contact_id = prof.contact_id
  )
ON CONFLICT (project_id, contact_id) DO UPDATE SET role = 'Owner';

SELECT 'Added project creators to teams' as step, COUNT(*) as total
FROM project_contacts;

-- ============================================================================
-- STEP 5: Verify the auto_add_project_creator trigger exists
-- ============================================================================
SELECT 
  'Trigger check' as step,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_add_project_creator') 
    THEN 'Trigger EXISTS - OK'
    ELSE 'Trigger MISSING - Need to create'
  END as status;

-- ============================================================================
-- STEP 6: Summary of current state
-- ============================================================================
SELECT 
  'Summary' as step,
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(DISTINCT project_id) FROM project_contacts) as projects_with_team,
  (SELECT COUNT(*) FROM project_contacts) as total_project_contact_links,
  (SELECT COUNT(*) FROM profiles WHERE contact_id IS NOT NULL) as profiles_with_contacts;

-- Show any projects still missing team members
SELECT 
  'Projects without team' as step,
  p.id as project_id,
  p.name as project_name,
  p.created_by_user_id,
  prof.contact_id as creator_contact_id
FROM projects p
LEFT JOIN profiles prof ON prof.id = p.created_by_user_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_contacts pc WHERE pc.project_id = p.id
)
LIMIT 10;
