-- Break RLS cycle: project_contacts policies queried projects, whose SELECT policy
-- queries project_contacts → "infinite recursion detected in policy for relation project_contacts".
-- These helpers read projects (and contacts) with row_security disabled after org is validated.

CREATE OR REPLACE FUNCTION public.project_contact_insert_allowed(
  p_project_id uuid,
  p_contact_id uuid,
  p_org_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_org uuid;
BEGIN
  v_user_org := public.get_user_organization_id();
  IF v_user_org IS NULL OR p_org_id IS DISTINCT FROM v_user_org THEN
    RETURN false;
  END IF;

  IF public.is_user_admin() AND EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = p_contact_id AND c.organization_id = v_user_org
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND p.organization_id = v_user_org
      AND p.project_manager_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND p.organization_id = v_user_org
      AND p.created_by_user_id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = p_contact_id AND c.organization_id = v_user_org
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_contact_user_can_manage_project(
  p_project_id uuid,
  p_org_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.get_user_organization_id() IS NOT NULL
    AND p_org_id = public.get_user_organization_id()
    AND (
      public.is_user_admin()
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = p_project_id
          AND p.organization_id = p_org_id
          AND p.project_manager_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.project_contact_insert_allowed(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_contact_user_can_manage_project(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_contact_insert_allowed(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.project_contact_user_can_manage_project(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins and PMs can assign contacts in their organization" ON public.project_contacts;
CREATE POLICY "Admins and PMs can assign contacts in their organization"
ON public.project_contacts
FOR INSERT
WITH CHECK (
  organization_id = (select public.get_user_organization_id())
  AND public.project_contact_insert_allowed(project_id, contact_id, organization_id)
);

DROP POLICY IF EXISTS "Admins and PMs can update project contacts in their organization" ON public.project_contacts;
CREATE POLICY "Admins and PMs can update project contacts in their organization"
ON public.project_contacts
FOR UPDATE
USING (
  public.project_contact_user_can_manage_project(project_id, organization_id)
);

DROP POLICY IF EXISTS "Admins and PMs can remove project contacts in their organization" ON public.project_contacts;
CREATE POLICY "Admins and PMs can remove project contacts in their organization"
ON public.project_contacts
FOR DELETE
USING (
  public.project_contact_user_can_manage_project(project_id, organization_id)
);
