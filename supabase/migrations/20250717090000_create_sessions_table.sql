-- Create sessions table with full schema
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  panel_id UUID REFERENCES public.panels(id) ON DELETE CASCADE,
  panelist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  panelist_name TEXT NOT NULL,
  panelist_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','recording','completed','transcribing')),
  audio_url TEXT,
  transcript TEXT,
  transcript_confidence DOUBLE PRECISION,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  recording_quality TEXT CHECK (recording_quality IN ('high','medium','low'))
);

-- Indexes for common queries
CREATE INDEX idx_sessions_panel_id ON public.sessions(panel_id);
CREATE INDEX idx_sessions_panelist_email ON public.sessions(panelist_email);
CREATE INDEX idx_sessions_status ON public.sessions(status);

-- Enable Row Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read public sessions
CREATE POLICY "Public read public sessions" ON public.sessions
FOR SELECT TO public
USING (is_public);

-- Panelists manage their sessions
CREATE POLICY "Panelists manage sessions" ON public.sessions
FOR ALL TO authenticated
USING (panelist_id = auth.uid())
WITH CHECK (panelist_id = auth.uid());

-- Automatically update timestamp
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
