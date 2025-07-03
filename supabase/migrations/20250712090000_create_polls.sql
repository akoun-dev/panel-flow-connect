-- Tables for polls feature
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES public.panels(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL
);

CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX idx_poll_votes_poll_id ON public.poll_votes(poll_id);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read polls" ON public.polls FOR SELECT TO public USING (true);
CREATE POLICY "Public read poll options" ON public.poll_options FOR SELECT TO public USING (true);
CREATE POLICY "Public read poll votes" ON public.poll_votes FOR SELECT TO public USING (true);

-- Owners manage polls and options
CREATE POLICY "Panel owners manage polls" ON public.polls
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.panels p
    WHERE p.id = polls.panel_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.panels p
    WHERE p.id = polls.panel_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Panel owners manage poll options" ON public.poll_options
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.polls po JOIN public.panels p ON po.panel_id = p.id
    WHERE po.id = poll_options.poll_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.polls po JOIN public.panels p ON po.panel_id = p.id
    WHERE po.id = poll_options.poll_id AND p.user_id = auth.uid()
  )
);

-- Anyone can vote
CREATE POLICY "Public insert poll votes" ON public.poll_votes
FOR INSERT TO public WITH CHECK (true);
