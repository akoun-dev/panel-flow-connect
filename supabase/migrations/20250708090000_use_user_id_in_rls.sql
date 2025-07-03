-- Migrate RLS policies to rely on user_id instead of emails

-- Drop outdated email-based policies
DROP POLICY IF EXISTS "Panelists can read their invitations" ON public.panel_invitations;
DROP POLICY IF EXISTS "Panelists can update their invitation status" ON public.panel_invitations;
DROP POLICY IF EXISTS "Panelists can read panels they are invited to" ON public.panels;

-- Create policies based on user_id
CREATE POLICY "Panelists can read their invitations"
ON public.panel_invitations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Panelists can update their invitation status"
ON public.panel_invitations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Panelists can read panels they are invited to"
ON public.panels
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR auth.uid() IN (
    SELECT user_id FROM panel_invitations WHERE panel_id = panels.id
  )
);

-- Remove legacy utility function
DROP FUNCTION IF EXISTS fix_invitation_email_mismatch(text, text);

-- Ensure user_id is populated for existing invitations
UPDATE panel_invitations
SET user_id = panels.user_id
FROM panels
WHERE panel_invitations.panel_id = panels.id
  AND panel_invitations.user_id IS NULL;
