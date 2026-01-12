-- Fix Missing contact_id in Profiles
-- This ensures all users have a contact_id so they can be added to projects

-- Find profiles without contact_id
SELECT 
  'Profiles without contact_id' as issue,
  COUNT(*) as count
FROM profiles 
WHERE contact_id IS NULL;

-- Create contacts for profiles that don't have one
-- Only insert if contact with this email doesn't already exist
INSERT INTO contacts (email, name, type, role, status, organization_id, created_by_user_id)
SELECT 
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1), 'User') as name,
  'Team' as type,
  'Team Member' as role,
  'Available' as status,
  p.organization_id,
  p.id as created_by_user_id
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.contact_id IS NULL
  AND u.email IS NOT NULL
  AND p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c 
    WHERE LOWER(c.email) = LOWER(u.email)
  );

-- Link the newly created contacts to their profiles
UPDATE profiles p
SET contact_id = c.id
FROM contacts c
JOIN auth.users u ON LOWER(u.email) = LOWER(c.email)
WHERE p.id = u.id
  AND p.contact_id IS NULL;

-- Verify the fix
SELECT 
  'After fix' as status,
  COUNT(*) as total_profiles,
  COUNT(contact_id) as profiles_with_contact,
  COUNT(*) - COUNT(contact_id) as profiles_missing_contact
FROM profiles;
