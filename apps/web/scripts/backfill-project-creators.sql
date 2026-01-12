-- Backfill Script: Add Project Creators to project_contacts
-- This ensures all project creators are automatically on their project teams

-- First, check current state
SELECT 
  'Projects missing creators' as check_type,
  COUNT(*) as count
FROM projects p
LEFT JOIN profiles prof ON prof.id = p.created_by_user_id
LEFT JOIN project_contacts pc ON pc.project_id = p.id AND pc.contact_id = prof.contact_id
WHERE pc.project_id IS NULL
  AND p.created_by_user_id IS NOT NULL;

-- Add project creators to their projects (where they're missing)
INSERT INTO project_contacts (project_id, contact_id, organization_id)
SELECT 
  p.id as project_id,
  prof.contact_id,
  p.organization_id
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
ON CONFLICT (project_id, contact_id) DO NOTHING;

-- Verify the fix
SELECT 
  'Projects after backfill' as check_type,
  COUNT(*) as total_projects,
  COUNT(CASE WHEN pc.project_id IS NOT NULL THEN 1 END) as projects_with_creator,
  COUNT(CASE WHEN pc.project_id IS NULL THEN 1 END) as projects_missing_creator
FROM projects p
LEFT JOIN profiles prof ON prof.id = p.created_by_user_id
LEFT JOIN project_contacts pc ON pc.project_id = p.id AND pc.contact_id = prof.contact_id
WHERE p.created_by_user_id IS NOT NULL;

-- Show any remaining issues (creators without contact_id)
SELECT 
  'Creators without contact_id' as issue,
  p.id as project_id,
  p.name as project_name,
  p.created_by_user_id,
  prof.contact_id
FROM projects p
LEFT JOIN profiles prof ON prof.id = p.created_by_user_id
WHERE p.created_by_user_id IS NOT NULL
  AND (prof.contact_id IS NULL OR prof.contact_id NOT IN (
    SELECT contact_id FROM project_contacts WHERE project_id = p.id
  ));
