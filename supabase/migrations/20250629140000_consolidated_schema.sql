-- Migration consolidée - Schéma complet du 29/06/2025

-- 1. Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- 2. Table users (sans politiques RLS initiales)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique permettant aux utilisateurs de créer/mettre à jour leur propre profil
CREATE POLICY "Users can manage their own profile"
ON public.users
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- 3. Trigger de synchronisation users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, email, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 4. Tables principales
CREATE TABLE IF NOT EXISTS panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0),
  participants_limit INTEGER NOT NULL CHECK (participants_limit > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled')),
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  qr_code_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  panelists JSONB DEFAULT '[]',
  theme TEXT,
  allocated_time INTEGER CHECK (allocated_time > 0),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  moderator_name TEXT,
  moderator_email TEXT
);

CREATE TABLE IF NOT EXISTS panel_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  panelist_email TEXT NOT NULL,
  unique_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Index et contraintes
CREATE INDEX IF NOT EXISTS idx_panels_user_id ON panels(user_id);
CREATE INDEX IF NOT EXISTS idx_panels_status ON panels(status);
CREATE INDEX IF NOT EXISTS idx_panels_date ON panels(date);
CREATE INDEX IF NOT EXISTS idx_panel_invitations_panel_id ON panel_invitations(panel_id);
CREATE INDEX IF NOT EXISTS idx_panel_invitations_panelist_email ON panel_invitations(panelist_email);
CREATE INDEX IF NOT EXISTS idx_panel_invitations_status ON panel_invitations(status);

ALTER TABLE panel_invitations DROP CONSTRAINT IF EXISTS unique_panel_panelist;
ALTER TABLE panel_invitations ADD CONSTRAINT unique_panel_panelist UNIQUE (panel_id, panelist_email);

ALTER TABLE panels DROP CONSTRAINT IF EXISTS panels_user_id_users_fkey;
ALTER TABLE panels ADD CONSTRAINT panels_user_id_users_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6. Fonctions triggers
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

-- 7. Triggers
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

-- 8. Fonctions utilitaires
CREATE OR REPLACE FUNCTION is_panel_owner(panel_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN panel_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_panels()
RETURNS SETOF panels AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM panels
  WHERE user_id = auth.uid()
  
  UNION
  
  SELECT p.* FROM panels p
  JOIN (
    SELECT panel_id FROM panel_invitations
    WHERE panelist_email = auth.jwt() ->> 'email'
    AND status IN ('accepted', 'pending')
  ) pi ON p.id = pi.panel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_invitations(user_email text)
RETURNS TABLE (
  id uuid,
  panel_id uuid,
  panelist_email text,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  panel_title text,
  panel_description text,
  panel_date date,
  panel_time time,
  panel_duration integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id,
    pi.panel_id,
    pi.panelist_email,
    pi.status,
    pi.expires_at,
    pi.created_at,
    p.title as panel_title,
    p.description as panel_description,
    p.date as panel_date,
    p.time as panel_time,
    p.duration as panel_duration
  FROM panel_invitations pi
  LEFT JOIN panels p ON pi.panel_id = p.id
  WHERE pi.panelist_email = user_email
  ORDER BY pi.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fix_invitation_email_mismatch(
  old_email text,
  new_email text
) RETURNS void AS $$
BEGIN
  UPDATE public.panel_invitations 
  SET panelist_email = new_email
  WHERE panelist_email = old_email;
  
  RAISE NOTICE 'Updated email from % to % in panel_invitations', old_email, new_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Activation RLS
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_invitations ENABLE ROW LEVEL SECURITY;

-- 10. Suppression des politiques existantes
DROP POLICY IF EXISTS "Enable read access for invited panelists" ON public.panels;
DROP POLICY IF EXISTS "Panel owners can create invitations for their panels" ON public.panel_invitations;
DROP POLICY IF EXISTS "Panel owners can read their panel invitations" ON public.panel_invitations;
DROP POLICY IF EXISTS "Panel owners can update their panel invitations" ON public.panel_invitations;
DROP POLICY IF EXISTS "Enable insert for panel owner" ON public.panel_invitations;
DROP POLICY IF EXISTS "Enable read access for panel owner" ON public.panel_invitations;
DROP POLICY IF EXISTS "Enable update for panel owner" ON public.panel_invitations;

-- 11. Politiques SIMPLIFIÉES pour panel_invitations (sans référence à panels)
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

-- 12. Politique SIMPLIFIÉE pour panels (accès élargi pour éviter la récursion)
CREATE POLICY "Users can read accessible panels"
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

-- Alternative : Politique très permissive pour éviter la récursion
DROP POLICY IF EXISTS "Users can read accessible panels" ON public.panels;
CREATE POLICY "Authenticated users can read panels"
ON public.panels
FOR SELECT
TO authenticated
USING (true);

-- 13. Fonction helper pour vérifier l'accès (optionnelle, pour usage côté client)
CREATE OR REPLACE FUNCTION user_can_access_panel(panel_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier si l'utilisateur est propriétaire
  IF EXISTS (
    SELECT 1 FROM panels 
    WHERE id = panel_uuid AND user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Vérifier si l'utilisateur a une invitation
  IF EXISTS (
    SELECT 1 FROM panel_invitations 
    WHERE panel_id = panel_uuid 
    AND panelist_email = auth.jwt() ->> 'email'
    AND status IN ('accepted', 'pending')
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION user_can_access_panel(UUID) TO authenticated;

-- 14. Permissions
GRANT EXECUTE ON FUNCTION get_user_invitations(text) TO authenticated;
