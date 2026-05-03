-- Remove deprecated financial permission key from all role permission blobs.
-- This keeps existing role authorization explicit and avoids showing obsolete ability toggles.
UPDATE roles
SET permissions = COALESCE(permissions, '{}'::jsonb) - 'can_view_financials'
WHERE permissions ? 'can_view_financials';
