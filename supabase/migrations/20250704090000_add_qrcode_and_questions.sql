-- Ajout du champ QR code à la table panels
ALTER TABLE public.panels
  ADD COLUMN qr_code TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Création de la table pour les questions
CREATE TABLE public.panel_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES public.panels(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL REFERENCES public.panels(qr_code),
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Politiques RLS pour les questions
CREATE POLICY "Enable insert for authenticated users" 
ON "public"."panel_questions"
AS PERMISSIVE 
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable read access for panel owner"
ON "public"."panel_questions"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.panels
  WHERE panels.id = panel_questions.panel_id
  AND panels.user_id = auth.uid()
));

-- Autoriser la modification des questions par le propriétaire du panel ou un admin
CREATE POLICY "Panel owner or admin can update questions"
ON "public"."panel_questions"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  auth.role() = 'admin' OR EXISTS (
    SELECT 1 FROM public.panels
    WHERE panels.id = panel_questions.panel_id
    AND panels.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.role() = 'admin' OR EXISTS (
    SELECT 1 FROM public.panels
    WHERE panels.id = panel_questions.panel_id
    AND panels.user_id = auth.uid()
  )
);

-- Autoriser la suppression des questions par le propriétaire du panel ou un admin
CREATE POLICY "Panel owner or admin can delete questions"
ON "public"."panel_questions"
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  auth.role() = 'admin' OR EXISTS (
    SELECT 1 FROM public.panels
    WHERE panels.id = panel_questions.panel_id
    AND panels.user_id = auth.uid()
  )
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_panel_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS panel_questions_updated_at ON public.panel_questions;
CREATE TRIGGER panel_questions_updated_at
BEFORE UPDATE ON public.panel_questions
FOR EACH ROW
EXECUTE FUNCTION update_panel_questions_updated_at();