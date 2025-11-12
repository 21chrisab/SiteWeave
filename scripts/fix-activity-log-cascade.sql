-- Fix activity_log foreign key constraint to allow project deletion
-- This script drops the existing constraint and recreates it with ON DELETE CASCADE
-- The actual constraint name in Supabase is: activity_log_project_id_fkey

-- Drop the existing constraint (trying both possible names)
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_project_id_fkey;
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS fk_activity_log_project_id;

-- Recreate the constraint with ON DELETE CASCADE
ALTER TABLE activity_log 
ADD CONSTRAINT fk_activity_log_project_id 
FOREIGN KEY (project_id) 
REFERENCES projects(id) 
ON DELETE CASCADE;

