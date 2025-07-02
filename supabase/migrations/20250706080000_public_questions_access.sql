-- Migration pour rendre toutes les questions accessibles publiquement
-- Suppression des anciennes politiques restrictives
DROP POLICY IF EXISTS "Users can view panel questions" ON public.questions;

-- Nouvelle politique d'accès public en lecture
CREATE POLICY "Public can read all questions"
ON public.questions
FOR SELECT
TO public
USING (true);

-- Politique pour les modifications (réservée aux modérateurs/propriétaires)
CREATE POLICY "Moderators can manage questions"
ON public.questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.panels
    WHERE panels.id = questions.panel_id
    AND panels.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.panels
    WHERE panels.id = questions.panel_id
    AND panels.user_id = auth.uid()
  )
);