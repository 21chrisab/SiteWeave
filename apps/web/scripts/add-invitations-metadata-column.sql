-- Migration: Add metadata column to invitations table
-- This allows storing user information (first_name, last_name, phone) with invitations
-- so profiles can be pre-filled when users accept invitations

DO $$
BEGIN
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitations' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE invitations ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Column "metadata" added to "invitations" table.';
    ELSE
        RAISE NOTICE 'Column "metadata" already exists in "invitations" table. Skipping.';
    END IF;
END $$;
