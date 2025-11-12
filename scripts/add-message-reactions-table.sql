-- Add message_reactions table for message emoji reactions
-- Run this script to add the missing table to your database
-- This script automatically detects the type of messages.id and uses the matching type

DO $$ 
DECLARE
    message_id_type TEXT;
    message_id_udt_name TEXT;
BEGIN
    -- Get the actual data type of messages.id column (check both data_type and udt_name)
    SELECT data_type, udt_name INTO message_id_type, message_id_udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'id';
    
    -- Drop existing constraints first if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reactions') THEN
        ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS fk_message_reactions_message_id;
        ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS fk_message_reactions_user_id;
    END IF;
    
    -- Drop the table if it exists with wrong type
    DROP TABLE IF EXISTS message_reactions CASCADE;
    
    -- Create the table with the correct message_id type
    -- Check udt_name as it's more reliable for PostgreSQL types
    IF message_id_udt_name = 'uuid' OR message_id_type = 'uuid' THEN
        CREATE TABLE message_reactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id UUID NOT NULL,
            user_id UUID NOT NULL,
            emoji TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(message_id, user_id, emoji)
        );
    ELSIF message_id_udt_name = 'int8' OR message_id_udt_name = 'int4' OR message_id_type = 'bigint' OR message_id_type = 'integer' THEN
        CREATE TABLE message_reactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id BIGINT NOT NULL,
            user_id UUID NOT NULL,
            emoji TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(message_id, user_id, emoji)
        );
    ELSE
        RAISE EXCEPTION 'Unknown messages.id type: data_type=%, udt_name=%', message_id_type, message_id_udt_name;
    END IF;
    
    -- Add foreign key constraints
    ALTER TABLE message_reactions ADD CONSTRAINT fk_message_reactions_message_id FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;
    ALTER TABLE message_reactions ADD CONSTRAINT fk_message_reactions_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can see reactions for accessible messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can create reactions for accessible messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.message_reactions;

-- Create RLS policies
CREATE POLICY "Users can see reactions for accessible messages"
ON public.message_reactions
FOR SELECT
USING (
  message_id IN (
    SELECT m.id 
    FROM public.messages m
    JOIN public.message_channels mc ON m.channel_id = mc.id
    WHERE mc.project_id IN (SELECT id FROM public.projects)
  )
);

CREATE POLICY "Users can create reactions for accessible messages"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND
  message_id IN (
    SELECT m.id 
    FROM public.messages m
    JOIN public.message_channels mc ON m.channel_id = mc.id
    WHERE mc.project_id IN (SELECT id FROM public.projects)
  )
);

CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions
FOR DELETE
USING (user_id = auth.uid());

