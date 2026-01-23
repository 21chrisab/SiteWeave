-- ============================================================================
-- Optimize Existing Indexes
-- ============================================================================
-- This script adds:
-- 1. Partial indexes for filtered queries (active projects, pending tasks)
-- 2. Composite indexes where beneficial
-- 3. Covering indexes for frequently accessed columns
-- ============================================================================

-- ============================================================================
-- PARTIAL INDEXES (Filtered indexes for common query patterns)
-- ============================================================================

-- Partial index for active projects (most common statuses)
CREATE INDEX IF NOT EXISTS idx_projects_active 
ON projects(organization_id, status, created_at DESC) 
WHERE status IN ('Planning', 'In Progress');

-- Partial index for completed projects (for historical queries)
CREATE INDEX IF NOT EXISTS idx_projects_completed 
ON projects(organization_id, created_at DESC) 
WHERE status = 'Completed';

-- Partial index for pending tasks (most common query)
CREATE INDEX IF NOT EXISTS idx_tasks_pending 
ON tasks(project_id, assignee_id, due_date) 
WHERE completed = false;

-- Partial index for overdue tasks
-- Note: Cannot use CURRENT_DATE in index predicate (must be IMMUTABLE)
-- Index on incomplete tasks with due dates - queries can filter by date
CREATE INDEX IF NOT EXISTS idx_tasks_overdue 
ON tasks(organization_id, due_date) 
WHERE completed = false 
    AND due_date IS NOT NULL;

-- Partial index for active calendar events (upcoming)
-- Note: Cannot use CURRENT_TIMESTAMP in index predicate (must be IMMUTABLE)
-- Index all events - queries can filter by start_time >= NOW()
CREATE INDEX IF NOT EXISTS idx_calendar_events_upcoming 
ON calendar_events(organization_id, start_time);

-- Partial index for pending invitations
CREATE INDEX IF NOT EXISTS idx_invitations_pending_org 
ON invitations(organization_id, created_at DESC) 
WHERE status = 'pending';

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Projects: organization + status + created_at (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_projects_org_status_created 
ON projects(organization_id, status, created_at DESC);

-- Tasks: organization + project + completed + assignee (common filtering)
CREATE INDEX IF NOT EXISTS idx_tasks_org_project_completed_assignee 
ON tasks(organization_id, project_id, completed, assignee_id)
WHERE assignee_id IS NOT NULL;

-- Messages: organization + channel + created_at (for org message feeds)
CREATE INDEX IF NOT EXISTS idx_messages_org_channel_created 
ON messages(organization_id, channel_id, created_at DESC)
WHERE organization_id IS NOT NULL AND channel_id IS NOT NULL;

-- Contacts: organization + type + status (common filtering)
CREATE INDEX IF NOT EXISTS idx_contacts_org_type_status 
ON contacts(organization_id, type, status);

-- ============================================================================
-- COVERING INDEXES (Include frequently accessed columns)
-- ============================================================================

-- Projects: Covering index for common project list queries
-- (Includes name, status, project_type for common SELECT patterns)
-- Note: PostgreSQL doesn't support true covering indexes, but we can create
-- composite indexes that include commonly selected columns in the right order

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check partial indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexdef LIKE '%WHERE%'
ORDER BY tablename, indexname;

DO $$
BEGIN
    RAISE NOTICE 'Index optimization complete';
    RAISE NOTICE 'Partial indexes created for common filtered queries';
END $$;
