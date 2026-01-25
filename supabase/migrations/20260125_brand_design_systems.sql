-- supabase/migrations/20260125_brand_design_systems.sql

-- Brand Design DNA (extracted from website via AI Vision)
CREATE TABLE IF NOT EXISTS brand_design_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_base64 TEXT,
  design_dna JSONB NOT NULL,
  ai_model TEXT,
  confidence_score NUMERIC,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Brand Design Systems
CREATE TABLE IF NOT EXISTS brand_design_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  design_dna_id UUID REFERENCES brand_design_dna(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  design_dna_hash TEXT NOT NULL,
  tokens JSONB NOT NULL,
  component_styles JSONB NOT NULL,
  decorative_elements JSONB,
  interactions JSONB,
  typography_treatments JSONB,
  image_treatments JSONB,
  compiled_css TEXT NOT NULL,
  variant_mappings JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active system per project per hash
  UNIQUE(project_id, design_dna_hash)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_brand_dna_project ON brand_design_dna(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_systems_project ON brand_design_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_systems_hash ON brand_design_systems(design_dna_hash);

-- Row Level Security
ALTER TABLE brand_design_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_design_systems ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can access their own project's data)
CREATE POLICY "Users can view own brand_design_dna"
  ON brand_design_dna FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own brand_design_dna"
  ON brand_design_dna FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own brand_design_dna"
  ON brand_design_dna FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own brand_design_dna"
  ON brand_design_dna FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own brand_design_systems"
  ON brand_design_systems FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own brand_design_systems"
  ON brand_design_systems FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own brand_design_systems"
  ON brand_design_systems FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own brand_design_systems"
  ON brand_design_systems FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
