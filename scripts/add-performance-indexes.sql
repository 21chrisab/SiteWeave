-- Performance Optimization Indexes
-- Run this script in Supabase SQL Editor to dramatically improve query performance
-- These indexes target the most frequently queried columns

-- ============================================
-- CRITICAL INDEXES (Run these first)
-- ============================================

-- Projects: Filter by organization
CREATE INDEX IF NOT EXISTS idx_projects_organization_id 
ON projects(organization_id);

-- Projects: Filter by status
CREATE INDEX IF NOT EXISTS idx_projects_status 
ON projects(status);

-- Projects: Composite index for organization + status queries
CREATE INDEX IF NOT EXISTS idx_projects_org_status 
ON projects(organization_id, status);

-- Profiles: Filter by organization
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
ON profiles(organization_id);

-- Profiles: Lookup by role
CREATE INDEX IF NOT EXISTS idx_profiles_role_id 
ON profiles(role_id);

-- Profiles: Composite index for organization + role
CREATE INDEX IF NOT EXISTS idx_profiles_org_role 
ON profiles(organization_id, role_id);

-- Contacts: Filter by organization
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id 
ON contacts(organization_id);

-- Contacts: Lookup by email (for user matching)
CREATE INDEX IF NOT EXISTS idx_contacts_email 
ON contacts(email);

-- Contacts: Filter by type
CREATE INDEX IF NOT EXISTS idx_contacts_type 
ON contacts(type);

-- Tasks: Filter by project
CREATE INDEX IF NOT EXISTS idx_tasks_project_id 
ON tasks(project_id);

-- Tasks: Filter by assignee
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id 
ON tasks(assignee_id);

-- Tasks: Filter by completion status
CREATE INDEX IF NOT EXISTS idx_tasks_completed 
ON tasks(completed);

-- Tasks: Composite index for project + completion status queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_completed 
ON tasks(project_id, completed);

-- ============================================
-- SECONDARY INDEXES (Nice to have)
-- ============================================

-- Files: Filter by project
CREATE INDEX IF NOT EXISTS idx_files_project_id 
ON files(project_id);

-- Files: Filter by uploaded user
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by 
ON files(uploaded_by);

-- Calendar Events: Filter by project
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_id 
ON calendar_events(project_id);

-- Calendar Events: Filter by date range
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time 
ON calendar_events(start_time);

-- Calendar Events: Filter by end date
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time 
ON calendar_events(end_time);

-- Messages: Filter by channel
CREATE INDEX IF NOT EXISTS idx_messages_channel_id 
ON messages(channel_id);

-- Messages: Filter by sender
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON messages(sender_id);

-- Messages: Order by timestamp
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(created_at DESC);

-- Message Channels: Filter by project
CREATE INDEX IF NOT EXISTS idx_message_channels_project_id 
ON message_channels(project_id);

-- Project Contacts: Composite index for lookups
CREATE INDEX IF NOT EXISTS idx_project_contacts_project_contact 
ON project_contacts(project_id, contact_id);

-- Project Contacts: Reverse lookup
CREATE INDEX IF NOT EXISTS idx_project_contacts_contact_project 
ON project_contacts(contact_id, project_id);

-- Invitations: Filter by organization
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id 
ON invitations(organization_id);

-- Invitations: Lookup by token
CREATE INDEX IF NOT EXISTS idx_invitations_token 
ON invitations(invitation_token);

-- Invitations: Filter by status
CREATE INDEX IF NOT EXISTS idx_invitations_status 
ON invitations(status);

-- Invitations: Filter by email
CREATE INDEX IF NOT EXISTS idx_invitations_email 
ON invitations(email);

-- Roles: Filter by organization
CREATE INDEX IF NOT EXISTS idx_roles_organization_id 
ON roles(organization_id);

-- Activity Log: Filter by organization
CREATE INDEX IF NOT EXISTS idx_activity_log_organization_id 
ON activity_log(organization_id) 
WHERE organization_id IS NOT NULL;

-- Activity Log: Filter by project
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id 
ON activity_log(project_id) 
WHERE project_id IS NOT NULL;

-- Activity Log: Order by timestamp
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at 
ON activity_log(created_at DESC);

-- User Preferences: Lookup by user
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences(user_id);

-- ============================================
-- VERIFY INDEXES
-- ============================================

-- Run this query to see all indexes created:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- ============================================
-- PERFORMANCE TESTING
-- ============================================

-- After adding indexes, test query performance:
-- EXPLAIN ANALYZE SELECT * FROM projects WHERE organization_id = 'your-org-id';
-- EXPLAIN ANALYZE SELECT * FROM contacts WHERE organization_id = 'your-org-id';
-- EXPLAIN ANALYZE SELECT * FROM tasks WHERE project_id = 'your-project-id';

-- ============================================
-- MAINTENANCE
-- ============================================

-- Indexes are automatically maintained by PostgreSQL
-- No manual maintenance required
-- They will slow down INSERT/UPDATE/DELETE slightly but dramatically speed up SELECT queries

NOTIFY pgrst, 'reload schema';

