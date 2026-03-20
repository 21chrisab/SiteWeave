-- Migration: Single org admin role — use "Org Admin" only
-- Run once in Supabase SQL Editor (service role / postgres).
--
-- 1) Orgs with both "Org Admin" and "OrganizationAdmin": move profiles & invitations to Org Admin, delete legacy row.
-- 2) Remaining "OrganizationAdmin" rows: rename to Org Admin and align permissions.
-- 3) Ensure every Org Admin has progress-report and other canonical flags.

DO $$
DECLARE
  r RECORD;
  v_org_admin_id UUID;
  v_legacy_id UUID;
BEGIN
  -- --- Duplicate admin roles per organization ---
  FOR r IN
    SELECT o.id AS org_id
    FROM organizations o
    WHERE EXISTS (
      SELECT 1 FROM roles r1
      WHERE r1.organization_id = o.id AND r1.name = 'OrganizationAdmin'
    )
    AND EXISTS (
      SELECT 1 FROM roles r2
      WHERE r2.organization_id = o.id AND r2.name = 'Org Admin'
    )
  LOOP
    SELECT id INTO v_org_admin_id
    FROM roles
    WHERE organization_id = r.org_id AND name = 'Org Admin'
    LIMIT 1;

    SELECT id INTO v_legacy_id
    FROM roles
    WHERE organization_id = r.org_id AND name = 'OrganizationAdmin'
    LIMIT 1;

    IF v_org_admin_id IS NOT NULL AND v_legacy_id IS NOT NULL THEN
      UPDATE profiles SET role_id = v_org_admin_id WHERE role_id = v_legacy_id;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'role_id'
      ) THEN
        UPDATE invitations SET role_id = v_org_admin_id WHERE role_id = v_legacy_id;
      END IF;

      DELETE FROM roles WHERE id = v_legacy_id;
    END IF;
  END LOOP;
END $$;

-- Rename standalone OrganizationAdmin → Org Admin (no duplicate Org Admin in that org)
UPDATE roles r
SET name = 'Org Admin'
WHERE r.name = 'OrganizationAdmin'
AND r.organization_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM roles r2
  WHERE r2.organization_id = r.organization_id
  AND r2.name = 'Org Admin'
  AND r2.id <> r.id
);

-- Canonical Org Admin permissions (merge so existing true flags stay; these keys forced on)
UPDATE roles
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object(
  'can_manage_team', true,
  'can_manage_users', true,
  'can_manage_roles', true,
  'can_create_projects', true,
  'can_edit_projects', true,
  'can_delete_projects', true,
  'can_view_financials', true,
  'can_assign_tasks', true,
  'can_manage_contacts', true,
  'can_create_tasks', true,
  'can_edit_tasks', true,
  'can_delete_tasks', true,
  'can_send_messages', true,
  'can_manage_progress_reports', true
)
WHERE name = 'Org Admin'
AND organization_id IS NOT NULL;
