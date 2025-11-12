-- Fix tasks.assignee_id foreign key constraint
-- The constraint should reference contacts(id), not auth.users(id)
-- This script drops the existing constraint and recreates it correctly

-- Drop the existing constraint (trying both possible names)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_assignee_id;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;

-- Recreate the constraint to reference contacts(id) instead of users
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_assignee_id 
FOREIGN KEY (assignee_id) 
REFERENCES contacts(id);

