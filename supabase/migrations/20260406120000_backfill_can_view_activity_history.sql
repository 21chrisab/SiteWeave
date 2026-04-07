-- Backfill can_view_activity_history on existing roles (JSONB merge).
-- Run after deploying app code that reads this permission.
-- 1) Default missing key to false for all roles
-- 2) Enable for standard Org Admin and Project Manager role names

UPDATE public.roles
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"can_view_activity_history": false}'::jsonb
WHERE permissions IS NULL
   OR (permissions->>'can_view_activity_history') IS NULL;

UPDATE public.roles
SET permissions = permissions || '{"can_view_activity_history": true}'::jsonb
WHERE name IN ('Org Admin', 'Project Manager');
