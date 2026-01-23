-- ============================================================================
-- Add Missing Indexes
-- ============================================================================
-- This script adds indexes for:
-- 1. New columns (project_number)
-- 2. Common query patterns (created_at, due_date)
-- 3. Composite indexes for frequently used query combinations
-- ============================================================================

-- ============================================================================
-- PROJECTS TABLE INDEXES
-- ============================================================================

-- Index for project_number (newly added column)
CREATE INDEX IF NOT EXISTS idx_projects_project_number 
ON projects(project_number)
WHERE project_number IS NOT NULL;

-- Index for created_at (for sorting/filtering by date)
CREATE INDEX IF NOT EXISTS idx_projects_created_at 
ON projects(created_at DESC);

-- Index for due_date (for date range queries)
CREATE INDEX IF NOT EXISTS idx_projects_due_date 
ON projects(due_date)
WHERE due_date IS NOT NULL;

-- Composite index for organization + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_projects_org_created_at 
ON projects(organization_id, created_at DESC);

-- Composite index for organization + due_date
CREATE INDEX IF NOT EXISTS idx_projects_org_due_date 
ON projects(organization_id, due_date)
WHERE due_date IS NOT NULL;

-- ============================================================================
-- CONTACTS TABLE INDEXES
-- ============================================================================

-- Index for name (for search/filtering)
CREATE INDEX IF NOT EXISTS idx_contacts_name 
ON contacts(name)
WHERE name IS NOT NULL;

-- Composite index for organization + name (for org-scoped searches)
CREATE INDEX IF NOT EXISTS idx_contacts_org_name 
ON contacts(organization_id, name)
WHERE name IS NOT NULL;

-- ============================================================================
-- TASKS TABLE INDEXES
-- ============================================================================

-- Index for due_date if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'due_date'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
        ON tasks(due_date)
        WHERE due_date IS NOT NULL;
        
        -- Composite index for organization + completed + due_date
        CREATE INDEX IF NOT EXISTS idx_tasks_org_completed_due_date 
        ON tasks(organization_id, completed, due_date)
        WHERE due_date IS NOT NULL;
    END IF;
END $$;

-- Composite index for organization + completed (common filtering pattern)
CREATE INDEX IF NOT EXISTS idx_tasks_org_completed 
ON tasks(organization_id, completed);

-- ============================================================================
-- MESSAGES TABLE INDEXES
-- ============================================================================

-- Composite index for channel + created_at (for message ordering)
CREATE INDEX IF NOT EXISTS idx_messages_channel_created_at 
ON messages(channel_id, created_at DESC)
WHERE channel_id IS NOT NULL;

-- ============================================================================
-- CALENDAR EVENTS TABLE INDEXES
-- ============================================================================

-- Composite index for organization + start_time (for org calendar views)
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_start_time 
ON calendar_events(organization_id, start_time);

-- Composite index for project + start_time
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_start_time 
ON calendar_events(project_id, start_time)
WHERE project_id IS NOT NULL;

-- ============================================================================
-- ACTIVITY LOG TABLE INDEXES
-- ============================================================================

-- Composite index for organization + created_at (for org activity feeds)
CREATE INDEX IF NOT EXISTS idx_activity_log_org_created_at 
ON activity_log(organization_id, created_at DESC)
WHERE organization_id IS NOT NULL;

-- Composite index for project + created_at
CREATE INDEX IF NOT EXISTS idx_activity_log_project_created_at 
ON activity_log(project_id, created_at DESC)
WHERE project_id IS NOT NULL;

-- ============================================================================
-- FILES TABLE INDEXES
-- ============================================================================

-- Index for modified_at (for sorting by modification date)
CREATE INDEX IF NOT EXISTS idx_files_modified_at 
ON files(modified_at DESC);

-- Composite index for project + modified_at
CREATE INDEX IF NOT EXISTS idx_files_project_modified_at 
ON files(project_id, modified_at DESC)
WHERE project_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        indexname LIKE 'idx_projects_project_number%'
        OR indexname LIKE 'idx_projects_created_at%'
        OR indexname LIKE 'idx_projects_due_date%'
        OR indexname LIKE 'idx_contacts_name%'
        OR indexname LIKE 'idx_tasks_due_date%'
        OR indexname LIKE 'idx_messages_channel_created_at%'
    )
ORDER BY tablename, indexname;

DO $$
BEGIN
    RAISE NOTICE 'Missing indexes added successfully';
END $$;
