-- Setup wizard completion (server-side) + is_user_admin includes Org Admin role name

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS setup_wizard_completed_at TIMESTAMPTZ;

-- Existing orgs: treat onboarding as already done so we do not interrupt current customers
UPDATE public.organizations
SET setup_wizard_completed_at = COALESCE(setup_wizard_completed_at, now())
WHERE setup_wizard_completed_at IS NULL;

-- Org Admins must be able to PATCH their organization (e.g. setup_wizard_completed_at); role name is "Org Admin"
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  ) OR COALESCE((SELECT get_user_role()) IN ('Admin', 'Org Admin'), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
