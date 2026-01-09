-- supabase/migrations/20260109000001_quality_rules_tracking.sql
-- Quality Rules Tracking: Rule definitions, pass snapshots, conflict detection, and analytics

-- ============================================================================
-- QUALITY RULE DEFINITIONS
-- Seeded from application, defines all audit rules with metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_rules (
  id VARCHAR(10) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('error', 'warning', 'info')),
  is_critical BOOLEAN DEFAULT false,
  threshold JSONB,
  upgrade_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE quality_rules IS 'Quality rule definitions seeded from application code';
COMMENT ON COLUMN quality_rules.id IS 'Short rule identifier e.g., Q1, Q2';
COMMENT ON COLUMN quality_rules.is_critical IS 'Critical rules must pass for article to be published';
COMMENT ON COLUMN quality_rules.threshold IS 'JSON with min/max/target values for rule validation';
COMMENT ON COLUMN quality_rules.upgrade_date IS 'Date when warning becomes error (for phased rollout)';


-- ============================================================================
-- RULE STATUS SNAPSHOTS
-- Captures rule compliance state before and after each pass
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_rule_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  pass_number INTEGER NOT NULL,
  snapshot_type VARCHAR(20) NOT NULL CHECK (snapshot_type IN ('before', 'after')),
  rules JSONB NOT NULL,
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_snapshots_job_pass
ON content_rule_snapshots(job_id, pass_number);

CREATE INDEX IF NOT EXISTS idx_rule_snapshots_type
ON content_rule_snapshots(snapshot_type);

COMMENT ON TABLE content_rule_snapshots IS 'Snapshots of rule compliance state before/after each pass';
COMMENT ON COLUMN content_rule_snapshots.rules IS 'JSON map of rule_id to {passed: bool, value: any, message: string}';
COMMENT ON COLUMN content_rule_snapshots.content_hash IS 'SHA-256 hash of content for integrity verification';


-- ============================================================================
-- PASS CHANGE DELTAS
-- Tracks which rules changed state between before/after snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_pass_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  pass_number INTEGER NOT NULL,
  rules_fixed TEXT[],
  rules_regressed TEXT[],
  rules_unchanged TEXT[],
  auto_reverted BOOLEAN DEFAULT false,
  revert_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pass_deltas_job
ON content_pass_deltas(job_id);

CREATE INDEX IF NOT EXISTS idx_pass_deltas_reverted
ON content_pass_deltas(auto_reverted) WHERE auto_reverted = true;

COMMENT ON TABLE content_pass_deltas IS 'Change deltas showing rule fixes/regressions per pass';
COMMENT ON COLUMN content_pass_deltas.rules_fixed IS 'Rule IDs that went from failing to passing';
COMMENT ON COLUMN content_pass_deltas.rules_regressed IS 'Rule IDs that went from passing to failing';
COMMENT ON COLUMN content_pass_deltas.auto_reverted IS 'Whether this pass was automatically reverted due to regression';


-- ============================================================================
-- SECTION-LEVEL VERSIONING
-- Fine-grained content versions for targeted rollback
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_section_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  section_key VARCHAR(50) NOT NULL,
  pass_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  rule_snapshot JSONB,
  is_best_version BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_versions_lookup
ON content_section_versions(job_id, section_key, pass_number);

CREATE INDEX IF NOT EXISTS idx_section_versions_best
ON content_section_versions(job_id, section_key) WHERE is_best_version = true;

COMMENT ON TABLE content_section_versions IS 'Section-level content versions for granular rollback';
COMMENT ON COLUMN content_section_versions.section_key IS 'Section identifier e.g., intro, body_1, conclusion';
COMMENT ON COLUMN content_section_versions.is_best_version IS 'Marks the highest quality version for this section';


-- ============================================================================
-- QUALITY ANALYTICS (DAILY AGGREGATION)
-- Historical analytics for tracking improvement over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  articles_generated INTEGER DEFAULT 0,
  articles_passed_first_time INTEGER DEFAULT 0,
  articles_auto_fixed INTEGER DEFAULT 0,
  articles_manual_intervention INTEGER DEFAULT 0,
  rule_compliance JSONB,
  conflict_patterns JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_date
ON quality_analytics_daily(user_id, date DESC);

COMMENT ON TABLE quality_analytics_daily IS 'Daily aggregated quality metrics per user';
COMMENT ON COLUMN quality_analytics_daily.rule_compliance IS 'JSON map of rule_id to {checks: int, passes: int, rate: float}';
COMMENT ON COLUMN quality_analytics_daily.conflict_patterns IS 'JSON array of detected conflict patterns between passes';


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_rule_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pass_deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_section_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Quality rules are readable by all authenticated users (shared definitions)
CREATE POLICY "quality_rules_read" ON quality_rules
  FOR SELECT TO authenticated USING (true);

-- Snapshots accessible via job ownership
CREATE POLICY "snapshots_via_job" ON content_rule_snapshots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Deltas accessible via job ownership
CREATE POLICY "deltas_via_job" ON content_pass_deltas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Section versions accessible via job ownership
CREATE POLICY "versions_via_job" ON content_section_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Analytics accessible by owner only
CREATE POLICY "analytics_owner" ON quality_analytics_daily
  FOR ALL TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- UPDATED_AT TRIGGER FOR QUALITY_RULES
-- Uses existing update_updated_at_column function from initial_schema
-- ============================================================================

CREATE TRIGGER quality_rules_updated_at
  BEFORE UPDATE ON quality_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
