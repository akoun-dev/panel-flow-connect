-- Migration consolidée pour appliquer les politiques RLS et droits nécessaires

-- 1. Suppression des politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Allow insert for auth service" ON public.users;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;

DROP POLICY IF EXISTS "Users can manage their panel invitations" ON public.panel_invitations;
DROP POLICY IF EXISTS "Panelists can read their invitations" ON public.panel_invitations;
DROP POLICY IF EXISTS "Panelists can update their invitation status" ON public.panel_invitations;
DROP POLICY IF EXISTS "Public can read invitations" ON public.panel_invitations;

DROP POLICY IF EXISTS "Users can manage their panels" ON public.panels;
DROP POLICY IF EXISTS "Users can read accessible panels" ON public.panels;
DROP POLICY IF EXISTS "Authenticated users can read panels" ON public.panels;
DROP POLICY IF EXISTS "Panelists can read panels they are invited to" ON public.panels;

DROP POLICY IF EXISTS "Users can manage their planning entries" ON public.user_planning;

-- 2. Création des politiques pour public.users
CREATE POLICY "Allow insert for auth service"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow select for authenticated users"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can manage their own profile"
ON public.users
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Politiques pour public.panel_invitations
CREATE POLICY "Users can manage their panel invitations"
ON public.panel_invitations
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Panelists can read their invitations"
ON public.panel_invitations
FOR SELECT
TO authenticated
USING (panelist_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Panelists can update their invitation status"
ON public.panel_invitations
FOR UPDATE
TO authenticated
USING (panelist_email = (auth.jwt() ->> 'email'))
WITH CHECK (panelist_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Public can read invitations"
ON public.panel_invitations
FOR SELECT
TO public
USING (true);

-- 4. Politiques pour public.panels
CREATE POLICY "Users can manage their panels"
ON public.panels
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Panelists can read panels they are invited to"
ON public.panels
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR auth.jwt() ->> 'email' IN (
    SELECT panelist_email 
    FROM panel_invitations 
    WHERE panel_id = panels.id
  )
);

-- 5. Politiques pour public.user_planning
CREATE POLICY "Users can manage their planning entries"
ON public.user_planning
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. Activation RLS (sécurisé)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_planning ENABLE ROW LEVEL SECURITY;

-- 7. Droits sur fonctions
GRANT EXECUTE ON FUNCTION get_user_invitations(text) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_access_panel(UUID) TO authenticated;

-- 8. Triggers de mise à jour des timestamps
DROP TRIGGER IF EXISTS panels_updated_at ON panels;
CREATE TRIGGER panels_updated_at
BEFORE UPDATE ON panels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS panel_invitations_updated_at ON panel_invitations;
CREATE TRIGGER panel_invitations_updated_at
BEFORE UPDATE ON panel_invitations
FOR EACH ROW
EXECUTE FUNCTION update_panel_invitation_updated_at();

DROP TRIGGER IF EXISTS user_planning_updated_at ON user_planning;
CREATE TRIGGER user_planning_updated_at
BEFORE UPDATE ON user_planning
FOR EACH ROW
EXECUTE FUNCTION update_user_planning_updated_at();
