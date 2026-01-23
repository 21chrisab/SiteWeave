-- ============================================================================
-- Migration: Fix Projects RLS Policy to Show Projects for Users Added via project_contacts
-- Date: 2024
-- Description: 
--   Fixes an issue where users added to projects via project_contacts couldn't
--   see those projects in the dashboard/details views, even though they could
--   see them in the messages tab. This was because the RLS policy only checked
--   contact_id from the user's profile, but didn't fall back to email matching
--   when contact_id wasn't set.
--
--   Also adds organization_id check to project_collaborators for consistency
--   and security.
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can see projects in their organization" ON public.projects;

-- Recreate the policy with the fix
CREATE POLICY "Users can see projects in their organization"
ON public.projects
FOR SELECT
USING (
  -- CRITICAL: Must be in same organization
  organization_id = (select get_user_organization_id())
  AND (
    -- Admin can see ALL projects in their org (even if not explicitly added)
    (select is_user_admin())
    OR
    -- PMs see their assigned projects
    (project_manager_id = (select auth.uid()))
    OR
    -- Creators see projects they created
    (created_by_user_id = (select auth.uid()))
    OR
    -- Team members see projects they're linked to via project_contacts
    -- Check both by contact_id (if profile has contact_id) and by email (fallback)
    (id IN (
      SELECT project_id
      FROM public.project_contacts
      WHERE (
        -- Match by contact_id if user's profile has one
        (contact_id = (select get_user_contact_id()) AND (select get_user_contact_id()) IS NOT NULL)
        OR
        -- Match by email if contact_id is not set (handles cases where user was added but profile contact_id not set)
        (contact_id IN (
          SELECT id 
          FROM public.contacts 
          WHERE LOWER(email) = LOWER((select get_user_email()))
            AND organization_id = (select get_user_organization_id())
        ))
      )
      AND organization_id = (select get_user_organization_id())
    ))
    OR
    -- Guest collaborators see projects they're invited to
    (id IN (
      SELECT project_id
      FROM public.project_collaborators
      WHERE user_id = (select auth.uid())
        AND organization_id = (select get_user_organization_id())
    ))
  )
);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This fix ensures that:
-- 1. Users added to projects via project_contacts can see those projects
--    even if their profile doesn't have a contact_id set (uses email matching)
-- 2. Project collaborators check now includes organization_id for security
-- ============================================================================
