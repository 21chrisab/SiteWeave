-- Activity history: enforce can_view_activity_history (and org admins) on SELECT;
-- allow NULL project_id rows when scoped to the user's organization;
-- allow INSERT for project-scoped logs OR org-only logs (NULL project_id) in user's org.

CREATE OR REPLACE FUNCTION public.user_can_view_activity_history()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE((r.permissions->>'can_view_activity_history')::boolean, false)
      FROM public.profiles p
      LEFT JOIN public.roles r ON r.id = p.role_id
      WHERE p.id = auth.uid()
      LIMIT 1
    ),
    false
  );
$$;

DROP POLICY IF EXISTS "Users can see activity for projects they have access to" ON public.activity_log;
DROP POLICY IF EXISTS "Users can see activity with permission and scope" ON public.activity_log;

CREATE POLICY "Users can see activity with permission and scope"
ON public.activity_log
FOR SELECT
TO authenticated
USING (
  (
    public.user_can_view_activity_history()
    OR public.is_user_admin()
  )
  AND (
    (
      project_id IS NOT NULL
      AND project_id IN (SELECT public.get_accessible_project_ids())
    )
    OR (
      project_id IS NULL
      AND organization_id = public.get_user_organization_id()
    )
  )
);

DROP POLICY IF EXISTS "Users can create activity logs for accessible projects" ON public.activity_log;
DROP POLICY IF EXISTS "Users can create activity logs for accessible scope" ON public.activity_log;

CREATE POLICY "Users can create activity logs for accessible scope"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  (
    project_id IS NOT NULL
    AND project_id IN (SELECT public.get_accessible_project_ids())
  )
  OR (
    project_id IS NULL
    AND organization_id = public.get_user_organization_id()
  )
);

-- Grant common field roles access where product expects it (name-based; customize in app settings).
UPDATE public.roles
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"can_view_activity_history": true}'::jsonb
WHERE LOWER(TRIM(name)) IN (
  'org admin',
  'project manager',
  'superintendent',
  'foreman',
  'site manager',
  'pm',
  'safety officer'
);
