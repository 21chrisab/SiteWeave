-- Enforce message_channels.project_id NOT NULL constraint and ensure cascade delete
-- This script:
-- 1. Deletes any orphaned message_channels (those without a project_id)
-- 2. Adds NOT NULL constraint to project_id
-- 3. Ensures the foreign key constraint with ON DELETE CASCADE is in place
-- Run this script to update your existing database

DO $$ 
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Step 1: Delete any orphaned message_channels (those without project_id or with invalid project_id)
    RAISE NOTICE 'Checking for orphaned message channels...';
    
    DELETE FROM message_channels 
    WHERE project_id IS NULL 
       OR project_id NOT IN (SELECT id FROM projects);
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count > 0 THEN
        RAISE NOTICE 'Deleted % orphaned message channel(s)', v_deleted_count;
    ELSE
        RAISE NOTICE 'No orphaned message channels found';
    END IF;
    
    -- Step 2: Drop the foreign key constraint if it exists (to allow adding NOT NULL)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_channels_project_id') THEN
        ALTER TABLE message_channels DROP CONSTRAINT fk_message_channels_project_id;
        RAISE NOTICE 'Dropped existing foreign key constraint';
    END IF;
    
    -- Step 3: Add NOT NULL constraint to project_id
    -- First check if the column already has NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'message_channels' 
          AND column_name = 'project_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE message_channels ALTER COLUMN project_id SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to project_id';
    ELSE
        RAISE NOTICE 'project_id already has NOT NULL constraint';
    END IF;
    
    -- Step 4: Re-add the foreign key constraint with ON DELETE CASCADE
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_channels_project_id') THEN
        ALTER TABLE message_channels 
        ADD CONSTRAINT fk_message_channels_project_id 
        FOREIGN KEY (project_id) 
        REFERENCES projects(id) 
        ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint with ON DELETE CASCADE';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

