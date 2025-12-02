-- Unified Audit System Tables
-- Phase 6: Intelligent Audit System for Foundation Pages

-- Drop existing tables if they exist (development only)
DROP TABLE IF EXISTS audit_history CASCADE;
DROP TABLE IF EXISTS audit_results CASCADE;

-- Main audit results table
CREATE TABLE audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Overall metrics
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Category results stored as JSONB
  -- Structure: { categoryId: { score, issues: [], fixableCount } }
  categories JSONB NOT NULL DEFAULT '{}',

  -- Issue counts
  total_issues INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  suggestion_count INTEGER DEFAULT 0,
  auto_fixable_count INTEGER DEFAULT 0,

  -- Metadata
  rules_snapshot JSONB, -- Snapshot of rules used for this audit
  run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  run_by UUID REFERENCES auth.users(id)
);

-- Audit history for undo capability
CREATE TABLE audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audit_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Fix identification
  issue_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  fix_type TEXT NOT NULL,

  -- Target details
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  field TEXT NOT NULL,

  -- Change tracking for undo
  old_value JSONB,
  new_value JSONB,

  -- Fix metadata
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  required_ai BOOLEAN DEFAULT false,
  description TEXT,

  -- Status tracking
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  undone_at TIMESTAMP WITH TIME ZONE,
  undone_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient queries
CREATE INDEX idx_audit_results_map_id ON audit_results(map_id);
CREATE INDEX idx_audit_results_user_id ON audit_results(user_id);
CREATE INDEX idx_audit_results_run_at ON audit_results(run_at DESC);
CREATE INDEX idx_audit_history_audit_id ON audit_history(audit_id);
CREATE INDEX idx_audit_history_user_id ON audit_history(user_id);
CREATE INDEX idx_audit_history_target ON audit_history(target_table, target_id);
CREATE INDEX idx_audit_history_category ON audit_history(category_id);

-- Row Level Security
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_history ENABLE ROW LEVEL SECURITY;

-- Policies for audit_results
CREATE POLICY "Users can view their own audit results"
  ON audit_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audit results"
  ON audit_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audit results"
  ON audit_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audit results"
  ON audit_results FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for audit_history
CREATE POLICY "Users can view their own audit history"
  ON audit_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audit history"
  ON audit_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audit history"
  ON audit_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to update run_at timestamp on update
CREATE OR REPLACE FUNCTION update_audit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.run_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_audit_timestamp ON audit_results;
CREATE TRIGGER trigger_update_audit_timestamp
  BEFORE UPDATE ON audit_results
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_timestamp();
