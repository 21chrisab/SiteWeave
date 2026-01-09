-- Migration Script: Add organization_id and role_id columns to invitations table

DO $$
BEGIN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitations' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE invitations ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Column "organization_id" added to "invitations" table.';
    ELSE
        RAISE NOTICE 'Column "organization_id" already exists in "invitations" table. Skipping.';
    END IF;

    -- Add role_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitations' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE invitations ADD COLUMN role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Column "role_id" added to "invitations" table.';
    ELSE
        RAISE NOTICE 'Column "role_id" already exists in "invitations" table. Skipping.';
    END IF;

    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invitations_organization_id') THEN
        ALTER TABLE invitations ADD CONSTRAINT fk_invitations_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Foreign key constraint "fk_invitations_organization_id" added.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invitations_role_id') THEN
        ALTER TABLE invitations ADD CONSTRAINT fk_invitations_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint "fk_invitations_role_id" added.';
    END IF;

    -- Add indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitations_organization_id') THEN
        CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
        RAISE NOTICE 'Index "idx_invitations_organization_id" created.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitations_role_id') THEN
        CREATE INDEX idx_invitations_role_id ON invitations(role_id);
        RAISE NOTICE 'Index "idx_invitations_role_id" created.';
    END IF;
END $$;

-- Verification
SELECT 'Verification: invitations table schema' AS status,
       column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invitations' 
  AND column_name IN ('organization_id', 'role_id')
ORDER BY column_name;
