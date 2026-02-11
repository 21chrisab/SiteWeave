-- Rollback Migration: Remove Progress Reports Feature
-- Drops tables, indexes, and policies created for progress reports

-- ============================================================================
-- DROP POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view schedules in their organization" ON progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can create schedules" ON progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can update schedules" ON progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can delete schedules" ON progress_report_schedules;

DROP POLICY IF EXISTS "Users can view recipients for accessible schedules" ON progress_report_recipients;
DROP POLICY IF EXISTS "Users with permission can manage recipients" ON progress_report_recipients;

DROP POLICY IF EXISTS "Users can view history in their organization" ON progress_report_history;
DROP POLICY IF EXISTS "Service role can manage history" ON progress_report_history;

DROP POLICY IF EXISTS "Users can view branding in their organization" ON organization_branding;
DROP POLICY IF EXISTS "Users with permission can manage branding" ON organization_branding;

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_progress_report_schedules_organization_id;
DROP INDEX IF EXISTS idx_progress_report_schedules_project_id;
DROP INDEX IF EXISTS idx_progress_report_schedules_next_send;
DROP INDEX IF EXISTS idx_progress_report_schedules_approval_status;
DROP INDEX IF EXISTS idx_progress_report_recipients_schedule_id;
DROP INDEX IF EXISTS idx_progress_report_recipients_contact_id;
DROP INDEX IF EXISTS idx_progress_report_history_schedule_id;
DROP INDEX IF EXISTS idx_progress_report_history_organization_id;
DROP INDEX IF EXISTS idx_progress_report_history_sent_at;

-- ============================================================================
-- DROP TABLES (in reverse order due to foreign keys)
-- ============================================================================

DROP TABLE IF EXISTS progress_report_history;
DROP TABLE IF EXISTS progress_report_recipients;
DROP TABLE IF EXISTS progress_report_schedules;
DROP TABLE IF EXISTS organization_branding;

-- ============================================================================
-- REMOVE PERMISSIONS (optional - keeps data but removes permission)
-- ============================================================================

-- Note: We don't remove the permission from roles as it may be used elsewhere
-- If you want to remove it, uncomment below:
-- UPDATE roles 
-- SET permissions = permissions - 'can_manage_progress_reports'
-- WHERE permissions ? 'can_manage_progress_reports';
