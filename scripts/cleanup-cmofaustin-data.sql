-- ============================================================================
-- Cleanup Script: Remove CM Of Austin Organization and Joe Copeland Account
-- ============================================================================
-- This script removes all data related to joe@cmofaustin.org/com and the
-- CM Of Austin organization to allow for a clean setup.
--
-- Run this script before executing the create-org-admin API call.
-- ============================================================================

BEGIN;

-- Log what we're about to delete (for debugging)
DO $$
DECLARE
    org_count INTEGER;
    user_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Check for organizations
    SELECT COUNT(*) INTO org_count
    FROM organizations
    WHERE slug = 'cmofaustin' OR LOWER(name) = 'cm of austin';
    
    RAISE NOTICE 'Found % organization(s) to delete', org_count;
    
    -- Check for users in auth.users
    SELECT COUNT(*) INTO user_count
    FROM auth.users
    WHERE LOWER(email) IN ('joe@cmofaustin.org', 'joe@cmofaustin.com');
    
    RAISE NOTICE 'Found % user(s) to delete from auth.users', user_count;
    
    -- Check for profiles
    SELECT COUNT(*) INTO profile_count
    FROM profiles p
    JOIN auth.users u ON p.id = u.id
    WHERE LOWER(u.email) IN ('joe@cmofaustin.org', 'joe@cmofaustin.com');
    
    RAISE NOTICE 'Found % profile(s) to delete', profile_count;
END $$;

-- ============================================================================
-- STEP 1: Delete the organization (this will cascade to most related data)
-- ============================================================================
-- The CASCADE DELETE constraints will automatically remove:
--   - roles
--   - project_collaborators
--   - projects
--   - contacts
--   - calendar_events
--   - event_categories
--   - files
--   - issue_comments
--   - issue_files
--   - issue_steps
--   - message_channels
--   - messages
--   - project_contacts
--   - project_tags
--   - project_team
--   - tasks
--   - tags
--   - activity_logs
--   - invitations
--   - progress_reports
--   - And any other org-scoped data

DELETE FROM organizations
WHERE slug = 'cmofaustin' OR LOWER(name) = 'cm of austin';

-- ============================================================================
-- STEP 2: Delete contacts that might reference the email
-- ============================================================================
-- Delete any contacts with the joe@cmofaustin email addresses
-- (that weren't already cascade deleted)
DELETE FROM contacts
WHERE LOWER(email) IN ('joe@cmofaustin.org', 'joe@cmofaustin.com');

-- ============================================================================
-- STEP 3: Delete user profiles
-- ============================================================================
-- Delete profiles for users with these email addresses
-- This needs to happen before deleting from auth.users
DELETE FROM profiles
WHERE id IN (
    SELECT id FROM auth.users
    WHERE LOWER(email) IN ('joe@cmofaustin.org', 'joe@cmofaustin.com')
);

-- ============================================================================
-- STEP 4: Delete from auth.users
-- ============================================================================
-- Finally, delete the actual auth users
-- Note: This might require special permissions as auth.users is in the auth schema
DELETE FROM auth.users
WHERE LOWER(email) IN ('joe@cmofaustin.org', 'joe@cmofaustin.com');

-- ============================================================================
-- STEP 5: Clean up any orphaned invitations
-- ============================================================================
-- Delete any invitations sent to these email addresses
DELETE FROM invitations
WHERE LOWER(email) IN ('joe@cmofaustin.org', 'joe@cmofaustin.com');

-- ============================================================================
-- VERIFICATION: Show what remains
-- ============================================================================
DO $$
DECLARE
    org_count INTEGER;
    user_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Check for organizations
    SELECT COUNT(*) INTO org_count
    FROM organizations
    WHERE slug = 'cmofaustin' OR LOWER(name) = 'cm of austin';
    
    -- Check for users in auth.users
    SELECT COUNT(*) INTO user_count
    FROM auth.users
    WHERE LOWER(email) IN ('joe@cmofaustin.org', 'joe@cmofaustin.com');
    
    -- Check for profiles
    SELECT COUNT(*) INTO profile_count
    FROM profiles p
    WHERE p.id IN (
        SELECT id FROM auth.users
        WHERE LOWER(email) IN ('joe@cmofaustin.org', 'joe@cmofaustin.com')
    );
    
    IF org_count = 0 AND user_count = 0 AND profile_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All CM Of Austin data has been cleaned up!';
    ELSE
        RAISE WARNING 'INCOMPLETE: Still found % org(s), % user(s), % profile(s)', org_count, user_count, profile_count;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Post-Cleanup Instructions:
-- ============================================================================
-- After running this script successfully, you can now run your PowerShell
-- command to create the organization and admin user with the correct email:
--
-- $supabaseUrl = "https://tchqmlyiwsqxwopvyxjx.supabase.co"
-- $serviceRoleKey = "YOUR_SERVICE_ROLE_KEY"
--
-- $body = @{
--     orgName = "CM Of Austin"
--     orgSlug = "cmofaustin"
--     adminEmail = "joe@cmofaustin.com"
--     adminPassword = "12345678"
--     adminName = "Joe Copeland"
-- } | ConvertTo-Json
--
-- Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/create-org-admin" `
--     -Method Post `
--     -Headers @{
--         "Authorization" = "Bearer $serviceRoleKey"
--         "Content-Type" = "application/json"
--     } `
--     -Body $body
-- ============================================================================
