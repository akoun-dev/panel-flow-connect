-- Migration pour créer la table user_planning

CREATE TABLE IF NOT EXISTS public.user_planning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  panel_id UUID REFERENCES public.panels(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, panel_id)
);

CREATE INDEX IF NOT EXISTS idx_user_planning_user_id ON public.user_planning(user_id);
CREATE INDEX IF NOT EXISTS idx_user_planning_panel_id ON public.user_planning(panel_id);

ALTER TABLE public.user_planning ENABLE ROW LEVEL SECURITY;

-- Politiques de base pour user_planning
CREATE POLICY "Users can manage their planning entries"
ON public.user_planning
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_user_planning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_planning_updated_at ON public.user_planning;
CREATE TRIGGER user_planning_updated_at
BEFORE UPDATE ON public.user_planning
FOR EACH ROW
EXECUTE FUNCTION update_user_planning_updated_at();