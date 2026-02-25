-- Migration: Project Templates (MVP)
-- Table for saving project structure (phases, tasks, dependencies) as reusable templates.
-- No financial or payment data. RLS scoped by organization_id.

-- ============================================================================
-- 1. PROJECT_TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    structure JSONB NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE project_templates IS 'Reusable project structure: phases, tasks, dependencies (index-based). No financial data.';
COMMENT ON COLUMN project_templates.structure IS 'JSON: { "phases": [...], "tasks": [...], "dependencies": [{ "predecessor_index", "successor_index", "dependency_type", "lag_days" }] }';

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_project_templates_organization_id ON project_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_at ON project_templates(created_at DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their organization"
ON project_templates FOR SELECT
USING (organization_id = (SELECT get_user_organization_id()));

CREATE POLICY "Users can create templates in their organization"
ON project_templates FOR INSERT
WITH CHECK (organization_id = (SELECT get_user_organization_id()));

CREATE POLICY "Users can update templates in their organization"
ON project_templates FOR UPDATE
USING (organization_id = (SELECT get_user_organization_id()));

CREATE POLICY "Users can delete templates in their organization"
ON project_templates FOR DELETE
USING (organization_id = (SELECT get_user_organization_id()));
