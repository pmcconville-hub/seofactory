-- Style guides table for persisting extracted style guides
CREATE TABLE IF NOT EXISTS public.style_guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  source_url TEXT NOT NULL,
  style_guide JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_style_guides_user_hostname
  ON public.style_guides(user_id, hostname, version DESC);

-- RLS
ALTER TABLE public.style_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own style guides"
  ON public.style_guides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own style guides"
  ON public.style_guides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own style guides"
  ON public.style_guides FOR DELETE
  USING (auth.uid() = user_id);
