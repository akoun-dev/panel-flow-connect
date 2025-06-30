-- Migration pour créer la table questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  panel_id UUID REFERENCES panels(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN DEFAULT TRUE,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Création d'un index pour les performances
CREATE INDEX idx_questions_panel_id ON questions(panel_id);

-- Activation de RLS (Row Level Security)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès
CREATE POLICY "Enable read access for authenticated users" 
ON questions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable public insert access for questions"
ON questions
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for admins only"
ON questions
FOR UPDATE
TO authenticated
USING (auth.role() = 'admin');

-- Table pour les réponses
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les réponses
CREATE INDEX idx_responses_question_id ON responses(question_id);

-- RLS pour les réponses
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès pour les réponses
CREATE POLICY "Enable read access for responses" 
ON responses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON responses
FOR INSERT
TO authenticated
WITH CHECK (true);