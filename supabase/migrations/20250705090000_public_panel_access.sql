-- Migration pour rendre tous les panels accessibles publiquement
-- Suppression des anciennes politiques restrictives
DROP POLICY IF EXISTS "Users can manage their panels" ON public.panels;
DROP POLICY IF EXISTS "Panelists can read panels they are invited to" ON public.panels;

-- Nouvelle politique d'accès public
CREATE POLICY "Public can read all panels"
ON public.panels
FOR SELECT
TO public
USING (true);

-- Politique pour les modifications (réservée aux propriétaires)
CREATE POLICY "Owners can manage their panels"
ON public.panels
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());