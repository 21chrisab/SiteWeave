-- Organization-wide progress reports (schedules with project_id IS NULL) require
-- can_manage_org_progress_reports. Project-scoped schedules keep can_manage_progress_reports.
-- Org Admin / super admins get the new flag via data migration below.

-- -----------------------------------------------------------------------------
-- 1) Grant org-wide progress report permission to Org Admin roles
-- -----------------------------------------------------------------------------

UPDATE public.roles
SET permissions = COALESCE(permissions, '{}'::jsonb)
  || '{"can_manage_org_progress_reports": true}'::jsonb
WHERE organization_id IS NOT NULL
  AND LOWER(TRIM(name)) = 'org admin';

-- -----------------------------------------------------------------------------
-- 2) progress_report_schedules
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users with permission can view schedules" ON public.progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can create schedules" ON public.progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can update schedules" ON public.progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can delete schedules" ON public.progress_report_schedules;

CREATE POLICY "Users with permission can view schedules"
ON public.progress_report_schedules FOR SELECT
USING (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR (
    organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
    AND (
      (
        project_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p3
          JOIN public.roles r ON r.id = p3.role_id
          WHERE p3.id = auth.uid()
            AND p3.organization_id = progress_report_schedules.organization_id
            AND (r.permissions->>'can_manage_progress_reports')::boolean = true
        )
      )
      OR (
        project_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p4
          JOIN public.roles r4 ON r4.id = p4.role_id
          WHERE p4.id = auth.uid()
            AND p4.organization_id = progress_report_schedules.organization_id
            AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
        )
      )
    )
  )
);

CREATE POLICY "Users with permission can create schedules"
ON public.progress_report_schedules FOR INSERT
WITH CHECK (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR (
    organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
    AND (
      (
        project_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p3
          JOIN public.roles r ON r.id = p3.role_id
          WHERE p3.id = auth.uid()
            AND p3.organization_id = progress_report_schedules.organization_id
            AND (r.permissions->>'can_manage_progress_reports')::boolean = true
        )
      )
      OR (
        project_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p4
          JOIN public.roles r4 ON r4.id = p4.role_id
          WHERE p4.id = auth.uid()
            AND p4.organization_id = progress_report_schedules.organization_id
            AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
        )
      )
    )
  )
);

CREATE POLICY "Users with permission can update schedules"
ON public.progress_report_schedules FOR UPDATE
USING (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR (
    organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
    AND (
      (
        project_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p3
          JOIN public.roles r ON r.id = p3.role_id
          WHERE p3.id = auth.uid()
            AND p3.organization_id = progress_report_schedules.organization_id
            AND (r.permissions->>'can_manage_progress_reports')::boolean = true
        )
      )
      OR (
        project_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p4
          JOIN public.roles r4 ON r4.id = p4.role_id
          WHERE p4.id = auth.uid()
            AND p4.organization_id = progress_report_schedules.organization_id
            AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
        )
      )
    )
  )
)
WITH CHECK (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR (
    organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
    AND (
      (
        project_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p3
          JOIN public.roles r ON r.id = p3.role_id
          WHERE p3.id = auth.uid()
            AND p3.organization_id = progress_report_schedules.organization_id
            AND (r.permissions->>'can_manage_progress_reports')::boolean = true
        )
      )
      OR (
        project_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p4
          JOIN public.roles r4 ON r4.id = p4.role_id
          WHERE p4.id = auth.uid()
            AND p4.organization_id = progress_report_schedules.organization_id
            AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
        )
      )
    )
  )
);

CREATE POLICY "Users with permission can delete schedules"
ON public.progress_report_schedules FOR DELETE
USING (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR (
    organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
    AND (
      (
        project_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p3
          JOIN public.roles r ON r.id = p3.role_id
          WHERE p3.id = auth.uid()
            AND p3.organization_id = progress_report_schedules.organization_id
            AND (r.permissions->>'can_manage_progress_reports')::boolean = true
        )
      )
      OR (
        project_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p4
          JOIN public.roles r4 ON r4.id = p4.role_id
          WHERE p4.id = auth.uid()
            AND p4.organization_id = progress_report_schedules.organization_id
            AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
        )
      )
    )
  )
);

-- -----------------------------------------------------------------------------
-- 3) progress_report_recipients (parent schedule dictates which permission applies)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users with permission can view recipients" ON public.progress_report_recipients;
DROP POLICY IF EXISTS "Users with permission can insert recipients" ON public.progress_report_recipients;
DROP POLICY IF EXISTS "Users with permission can update recipients" ON public.progress_report_recipients;
DROP POLICY IF EXISTS "Users with permission can delete recipients" ON public.progress_report_recipients;

CREATE POLICY "Users with permission can view recipients"
ON public.progress_report_recipients FOR SELECT
USING (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.progress_report_schedules s
    WHERE s.id = progress_report_recipients.schedule_id
      AND s.organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
      AND (
        (
          s.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p3
            JOIN public.roles r ON r.id = p3.role_id
            WHERE p3.id = auth.uid()
              AND p3.organization_id = s.organization_id
              AND (r.permissions->>'can_manage_progress_reports')::boolean = true
          )
        )
        OR (
          s.project_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p4
            JOIN public.roles r4 ON r4.id = p4.role_id
            WHERE p4.id = auth.uid()
              AND p4.organization_id = s.organization_id
              AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
          )
        )
      )
  )
);

CREATE POLICY "Users with permission can insert recipients"
ON public.progress_report_recipients FOR INSERT
WITH CHECK (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.progress_report_schedules s
    WHERE s.id = progress_report_recipients.schedule_id
      AND s.organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
      AND (
        (
          s.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p3
            JOIN public.roles r ON r.id = p3.role_id
            WHERE p3.id = auth.uid()
              AND p3.organization_id = s.organization_id
              AND (r.permissions->>'can_manage_progress_reports')::boolean = true
          )
        )
        OR (
          s.project_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p4
            JOIN public.roles r4 ON r4.id = p4.role_id
            WHERE p4.id = auth.uid()
              AND p4.organization_id = s.organization_id
              AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
          )
        )
      )
  )
);

CREATE POLICY "Users with permission can update recipients"
ON public.progress_report_recipients FOR UPDATE
USING (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.progress_report_schedules s
    WHERE s.id = progress_report_recipients.schedule_id
      AND s.organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
      AND (
        (
          s.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p3
            JOIN public.roles r ON r.id = p3.role_id
            WHERE p3.id = auth.uid()
              AND p3.organization_id = s.organization_id
              AND (r.permissions->>'can_manage_progress_reports')::boolean = true
          )
        )
        OR (
          s.project_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p4
            JOIN public.roles r4 ON r4.id = p4.role_id
            WHERE p4.id = auth.uid()
              AND p4.organization_id = s.organization_id
              AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
          )
        )
      )
  )
)
WITH CHECK (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.progress_report_schedules s
    WHERE s.id = progress_report_recipients.schedule_id
      AND s.organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
      AND (
        (
          s.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p3
            JOIN public.roles r ON r.id = p3.role_id
            WHERE p3.id = auth.uid()
              AND p3.organization_id = s.organization_id
              AND (r.permissions->>'can_manage_progress_reports')::boolean = true
          )
        )
        OR (
          s.project_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p4
            JOIN public.roles r4 ON r4.id = p4.role_id
            WHERE p4.id = auth.uid()
              AND p4.organization_id = s.organization_id
              AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
          )
        )
      )
  )
);

CREATE POLICY "Users with permission can delete recipients"
ON public.progress_report_recipients FOR DELETE
USING (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.progress_report_schedules s
    WHERE s.id = progress_report_recipients.schedule_id
      AND s.organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
      AND (
        (
          s.project_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p3
            JOIN public.roles r ON r.id = p3.role_id
            WHERE p3.id = auth.uid()
              AND p3.organization_id = s.organization_id
              AND (r.permissions->>'can_manage_progress_reports')::boolean = true
          )
        )
        OR (
          s.project_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p4
            JOIN public.roles r4 ON r4.id = p4.role_id
            WHERE p4.id = auth.uid()
              AND p4.organization_id = s.organization_id
              AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
          )
        )
      )
  )
);

-- -----------------------------------------------------------------------------
-- 4) progress_report_history
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users with permission can view history" ON public.progress_report_history;

CREATE POLICY "Users with permission can view history"
ON public.progress_report_history FOR SELECT
USING (
  (SELECT COALESCE(p.is_super_admin, false) FROM public.profiles p WHERE p.id = auth.uid())
  OR (
    organization_id IN (SELECT p2.organization_id FROM public.profiles p2 WHERE p2.id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.progress_report_schedules s
      WHERE s.id = progress_report_history.schedule_id
        AND s.organization_id = progress_report_history.organization_id
        AND (
          (
            s.project_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.profiles p3
              JOIN public.roles r ON r.id = p3.role_id
              WHERE p3.id = auth.uid()
                AND p3.organization_id = s.organization_id
                AND (r.permissions->>'can_manage_progress_reports')::boolean = true
            )
          )
          OR (
            s.project_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.profiles p4
              JOIN public.roles r4 ON r4.id = p4.role_id
              WHERE p4.id = auth.uid()
                AND p4.organization_id = s.organization_id
                AND (r4.permissions->>'can_manage_org_progress_reports')::boolean = true
            )
          )
        )
    )
  )
);
