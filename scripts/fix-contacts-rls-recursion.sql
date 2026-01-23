-- ============================================================================
-- Migration: Fix Contacts RLS Infinite Recursion
-- Date: 2025-01-22
-- Description: 
--   Fixes infinite recursion error in contacts RLS policy by simplifying
--   the SELECT policy to use organization_id-based access instead of
--   complex cross-table queries that create circular dependencies.
--
--   The old policy queried project_contacts and projects tables, which
--   have their own RLS policies that can query back to contacts, creating
--   infinite recursion.
--
--   The new policy uses:
--   1. organization_id matching (direct, no recursion)
--   2. Email matching for own contact (direct, no recursion)
--   3. created_by_user_id matching (direct, no recursion)
-- ============================================================================

-- Drop both old and new policies to ensure clean state
DROP POLICY IF EXISTS "Users can view their own contacts and contacts with their email" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their organization" ON public.contacts;

-- Create the new simplified policy that avoids recursion
CREATE POLICY "Users can view contacts in their organization"
ON public.contacts
FOR SELECT
USING (
  -- Contacts in same organization (primary access method - avoids recursion)
  organization_id = get_user_organization_id()
  OR
  -- Users can see their own contact (by email match, even if org is different - for collaborators)
  (LOWER(email) = LOWER(get_user_email()))
  OR
  -- Users can see contacts they created (even if org is different)
  (created_by_user_id = auth.uid())
);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- This fix ensures that:
-- 1. Users can see all contacts in their organization (via organization_id)
-- 2. Users can see their own contact (via email match, for collaborators)
-- 3. Users can see contacts they created (via created_by_user_id)
-- 4. No circular dependencies - policy doesn't query project_contacts or projects
-- ============================================================================
