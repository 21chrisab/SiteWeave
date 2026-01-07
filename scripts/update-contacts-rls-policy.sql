-- Update contacts RLS policy to allow users to see contacts with their email
-- This allows users to find contacts created by invite_or_add_member function

-- First, create a helper function to get user email (if it doesn't exist)
CREATE OR REPLACE FUNCTION get_user_email() RETURNS TEXT
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- IMPORTANT: Drop the existing policy FIRST before creating a new one
-- Run this in a separate query if you get an error
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their own contacts and contacts with their email" ON public.contacts;
DROP POLICY IF EXISTS "All authenticated users can view contacts" ON public.contacts;

-- Now create the updated policy
CREATE POLICY "Users can view their own contacts and contacts with their email"
ON public.contacts
FOR SELECT
USING (
  -- Users can see contacts they created
  (created_by_user_id = auth.uid())
  OR
  -- Users can see contacts that match their email (using helper function)
  (LOWER(email) = LOWER(get_user_email()))
  OR
  -- Admins and PMs can see all contacts
  (get_user_role() IN ('Admin', 'PM'))
);

