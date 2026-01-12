-- Migration Script: Add must_change_password column to profiles table
-- This column is used for non-repudiation: managed accounts must change their temporary password on first login

-- Add must_change_password column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'must_change_password'
    ) THEN
        ALTER TABLE profiles ADD COLUMN must_change_password BOOLEAN DEFAULT false;
        RAISE NOTICE 'Column must_change_password added to profiles table';
    ELSE
        RAISE NOTICE 'Column must_change_password already exists in profiles table';
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
AND table_name = 'profiles' 
AND column_name = 'must_change_password';
