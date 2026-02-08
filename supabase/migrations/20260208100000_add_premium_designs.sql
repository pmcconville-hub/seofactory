-- Premium Designs table — stores AI-generated brand-matched designs with version history
CREATE TABLE IF NOT EXISTS public.premium_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  topic_id UUID NOT NULL,
  brief_id UUID,
  map_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  target_url TEXT NOT NULL DEFAULT '',
  final_css TEXT NOT NULL DEFAULT '',
  final_html TEXT NOT NULL DEFAULT '',
  final_score REAL NOT NULL DEFAULT 0,
  target_screenshot TEXT,        -- base64, nullable for storage savings
  output_screenshot TEXT,        -- base64, nullable for storage savings
  validation_result JSONB,
  crawled_tokens JSONB,
  iterations_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'complete'
    CHECK (status IN ('complete', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each (user, topic, version) is unique
  UNIQUE(user_id, topic_id, version)
);

-- RLS
ALTER TABLE public.premium_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own designs"
  ON public.premium_designs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own designs"
  ON public.premium_designs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own designs"
  ON public.premium_designs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own designs"
  ON public.premium_designs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_premium_designs_user_id ON public.premium_designs(user_id);
CREATE INDEX idx_premium_designs_topic_id ON public.premium_designs(topic_id);
CREATE INDEX idx_premium_designs_user_topic ON public.premium_designs(user_id, topic_id, version DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_designs;

-- Updated_at trigger
CREATE TRIGGER update_premium_designs_updated_at
  BEFORE UPDATE ON public.premium_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
