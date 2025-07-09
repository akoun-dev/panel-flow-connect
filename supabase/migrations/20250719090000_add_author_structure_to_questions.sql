-- Ajout de la colonne author_structure pour stocker la structure de l'auteur
ALTER TABLE public.questions
  ADD COLUMN author_structure JSONB;

-- Index pour faciliter la recherche
CREATE INDEX IF NOT EXISTS idx_questions_author_structure ON public.questions USING GIN (author_structure);
