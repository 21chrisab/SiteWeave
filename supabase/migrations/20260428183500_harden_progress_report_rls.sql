-- Harden progress report RLS so report schedules, recipients, and history
-- are only accessible to users with can_manage_progress_reports in their org.

DROP POLICY IF EXISTS "Users can view schedules in their organization" ON progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can create schedules" ON progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can update schedules" ON progress_report_schedules;
DROP POLICY IF EXISTS "Users with permission can delete schedules" ON progress_report_schedules;

CREATE POLICY "Users with permission can view schedules"
ON progress_report_schedules FOR SELECT
USING (
  organization_id IN (
    SELECT p.organization_id
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);

CREATE POLICY "Users with permission can create schedules"
ON progress_report_schedules FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT p.organization_id
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);

CREATE POLICY "Users with permission can update schedules"
ON progress_report_schedules FOR UPDATE
USING (
  organization_id IN (
    SELECT p.organization_id
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
)
WITH CHECK (
  organization_id IN (
    SELECT p.organization_id
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);

CREATE POLICY "Users with permission can delete schedules"
ON progress_report_schedules FOR DELETE
USING (
  organization_id IN (
    SELECT p.organization_id
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);

DROP POLICY IF EXISTS "Users can view recipients for accessible schedules" ON progress_report_recipients;
DROP POLICY IF EXISTS "Users with permission can manage recipients" ON progress_report_recipients;

CREATE POLICY "Users with permission can view recipients"
ON progress_report_recipients FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM progress_report_schedules s
    JOIN profiles p ON p.organization_id = s.organization_id
    JOIN roles r ON r.id = p.role_id
    WHERE s.id = progress_report_recipients.schedule_id
      AND p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);

CREATE POLICY "Users with permission can insert recipients"
ON progress_report_recipients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM progress_report_schedules s
    JOIN profiles p ON p.organization_id = s.organization_id
    JOIN roles r ON r.id = p.role_id
    WHERE s.id = progress_report_recipients.schedule_id
      AND p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);

CREATE POLICY "Users with permission can update recipients"
ON progress_report_recipients FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM progress_report_schedules s
    JOIN profiles p ON p.organization_id = s.organization_id
    JOIN roles r ON r.id = p.role_id
    WHERE s.id = progress_report_recipients.schedule_id
      AND p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM progress_report_schedules s
    JOIN profiles p ON p.organization_id = s.organization_id
    JOIN roles r ON r.id = p.role_id
    WHERE s.id = progress_report_recipients.schedule_id
      AND p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);

CREATE POLICY "Users with permission can delete recipients"
ON progress_report_recipients FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM progress_report_schedules s
    JOIN profiles p ON p.organization_id = s.organization_id
    JOIN roles r ON r.id = p.role_id
    WHERE s.id = progress_report_recipients.schedule_id
      AND p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);

DROP POLICY IF EXISTS "Users can view history in their organization" ON progress_report_history;

CREATE POLICY "Users with permission can view history"
ON progress_report_history FOR SELECT
USING (
  organization_id IN (
    SELECT p.organization_id
    FROM profiles p
    JOIN roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND (r.permissions->>'can_manage_progress_reports')::boolean = true
  )
);
