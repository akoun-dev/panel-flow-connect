-- Migration consolidée pour appliquer les politiques RLS et droits nécessaires

-- Suppression des anciennes politiques conflictuelles
DROP POLICY IF EXISTS "Users can manage their panel invitations" ON public.panel_invitations;
DROP POLICY IF EXISTS "Panelists can read their invitations" ON public.panel_invitations;
DROP POLICY IF EXISTS "Panelists can update their invitation status" ON public.panel_invitations;
DROP POLICY IF EXISTS "Public can read invitations" ON public.panel_invitations;
DROP POLICY IF EXISTS "Authenticated users can read panels" ON public.panels;
DROP POLICY IF EXISTS "Users can read accessible panels" ON public.panels;
DROP POLICY IF EXISTS "Users can manage their planning entries" ON public.user_planning;

-- Politiques RLS pour panel_invitations
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

-- Politiques RLS pour panels
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

-- Politiques RLS pour user_planning
CREATE POLICY "Users can manage their planning entries"
ON public.user_planning
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Politiques RLS pour users (ajout pour permettre inscription)
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


-- Droits d'exécution sur fonctions
GRANT EXECUTE ON FUNCTION get_user_invitations(text) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_access_panel(UUID) TO authenticated;

-- Activer RLS sur les tables si ce n'est pas déjà fait
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_planning ENABLE ROW LEVEL SECURITY;

-- Triggers de mise à jour des timestamps (au cas où)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_panel_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_planning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
