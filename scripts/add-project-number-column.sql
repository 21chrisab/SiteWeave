-- Migration Script: Add project_number column to projects table
-- This column allows storing optional project numbers for tracking and identification

-- Add project_number column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'project_number'
    ) THEN
        ALTER TABLE projects ADD COLUMN project_number TEXT;
        RAISE NOTICE 'Column project_number added to projects table';
    ELSE
        RAISE NOTICE 'Column project_number already exists in projects table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects' 
AND column_name = 'project_number';
