-- Ajout de la colonne author_name pour enregistrer le nom de l'auteur
ALTER TABLE public.questions
  ADD COLUMN author_name TEXT;

-- Index pour faciliter les recherches par auteur
CREATE INDEX IF NOT EXISTS idx_questions_author_name ON public.questions(author_name);
