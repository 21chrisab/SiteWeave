-- Migration: Add created_at column to message_channels table
-- This fixes the error: column message_channels.created_at does not exist

-- Add created_at column to message_channels table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public'
                     AND table_name = 'message_channels' 
                     AND column_name = 'created_at') THEN
        ALTER TABLE message_channels ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        -- Update existing rows with current timestamp
        UPDATE message_channels SET created_at = now() WHERE created_at IS NULL;
        RAISE NOTICE 'Added created_at column to message_channels table';
    ELSE
        RAISE NOTICE 'created_at column already exists in message_channels table';
    END IF;
END $$;


































