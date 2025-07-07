-- Ajout de la colonne panelist_name pour stocker le nom du paneliste cible
ALTER TABLE public.questions
  ADD COLUMN panelist_name TEXT;

-- Index pour faciliter la recherche
CREATE INDEX IF NOT EXISTS idx_questions_panelist_name ON public.questions(panelist_name);
