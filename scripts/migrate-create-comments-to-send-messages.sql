-- Migration: Update create_comments permission to can_send_messages
-- This script updates all existing roles that have create_comments permission
-- to use the new can_send_messages permission name

-- Update roles that have create_comments: true
UPDATE public.roles
SET permissions = jsonb_set(
    permissions - 'create_comments',
    '{can_send_messages}',
    permissions->'create_comments'
)
WHERE permissions ? 'create_comments'
  AND (permissions->>'create_comments')::boolean = true;

-- Remove create_comments from roles that have it set to false
UPDATE public.roles
SET permissions = permissions - 'create_comments'
WHERE permissions ? 'create_comments'
  AND ((permissions->>'create_comments')::boolean = false OR permissions->>'create_comments' IS NULL);

-- Verify the migration
SELECT 
    id,
    name,
    permissions->'can_send_messages' as can_send_messages,
    permissions->'create_comments' as create_comments_old
FROM public.roles
WHERE permissions ? 'create_comments' OR permissions ? 'can_send_messages'
ORDER BY name;
