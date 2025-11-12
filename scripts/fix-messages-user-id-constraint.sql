-- Fix messages.user_id foreign key constraint
-- The constraint should reference auth.users(id), not contacts(id)
-- This script drops the existing constraint and recreates it correctly

-- Drop the existing constraint (trying both possible names)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_user_id;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

-- Recreate the constraint to reference auth.users(id) instead of contacts
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_user_id 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id);

