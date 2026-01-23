-- Fix Invitations RLS Policies for Public Invite Acceptance
-- Makes invitation acceptance more permissive - allows public access by token

-- Drop existing policies
DROP POLICY IF EXISTS "Users can see invitations they sent or received" ON public.invitations;
DROP POLICY IF EXISTS "Public can view invitations by token" ON public.invitations;
DROP POLICY IF EXISTS "Public can read pending invitations by token, users can see their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can accept their own invitations" ON public.invitations;

-- Recreate SELECT policy (more permissive for public access)
CREATE POLICY "Public can read pending invitations by token, users can see their invitations"
ON public.invitations
FOR SELECT
USING (
  -- Public access: any pending invitation with a token (for invite acceptance page)
  (
    status = 'pending'
    AND invitation_token IS NOT NULL
  )
  OR
  -- Authenticated users can see invitations they sent
  (
    auth.uid() IS NOT NULL
    AND invited_by_user_id = auth.uid()
  )
  OR
  -- Authenticated users can see invitations sent to their email (via contacts, not auth.users)
  (
    auth.uid() IS NOT NULL
    AND email IN (
      SELECT c.email
      FROM public.profiles p
      JOIN public.contacts c ON p.contact_id = c.id
      WHERE p.id = auth.uid()
    )
  )
);

-- Recreate UPDATE policy (more permissive - allows updates by token)
CREATE POLICY "Users can accept their own invitations"
ON public.invitations
FOR UPDATE
USING (
  (invited_by_user_id = auth.uid()) -- Sender can cancel/update
  OR
  (status = 'pending' AND invitation_token IS NOT NULL) -- Anyone with token can accept (for public invite flow)
  OR
  (email = get_user_email() AND status = 'pending') -- Recipient can accept by email match
)
WITH CHECK (
  (invited_by_user_id = auth.uid()) -- Sender can cancel/update
  OR
  (status IN ('pending', 'accepted')) -- Can update to accepted status
);
