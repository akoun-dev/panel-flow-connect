-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  panel_id UUID REFERENCES public.panels(id) ON DELETE CASCADE NOT NULL,
  panelist_id UUID,
  panelist_email TEXT,
  panelist_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER,
  status TEXT,
  audio_url TEXT,
  transcript TEXT,
  transcript_confidence INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  recording_quality TEXT
);

-- Indexes for frequent lookups
CREATE INDEX idx_sessions_panel_id ON public.sessions(panel_id);
CREATE INDEX idx_sessions_panelist_email ON public.sessions(panelist_email);

-- Enable row level security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sessions
CREATE POLICY "Public read sessions" ON public.sessions
FOR SELECT TO public
USING (true);

-- Only authenticated users may insert their own sessions
CREATE POLICY "Users insert sessions" ON public.sessions
FOR INSERT TO authenticated
WITH CHECK (panelist_id = auth.uid());

-- Only owners may update their sessions
CREATE POLICY "Users update sessions" ON public.sessions
FOR UPDATE TO authenticated
USING (panelist_id = auth.uid())
WITH CHECK (panelist_id = auth.uid());

-- Update timestamp automatically
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_updated_at ON public.sessions;
CREATE TRIGGER sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION update_sessions_updated_at();
