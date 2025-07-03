-- Ajout de la colonne panelist_email pour cibler un paneliste
ALTER TABLE public.questions
  ADD COLUMN panelist_email TEXT;

-- Index pour accélérer les recherches par paneliste
CREATE INDEX IF NOT EXISTS idx_questions_panelist_email ON public.questions(panelist_email);
