-- supabase/migrations/20260127200000_fix_brand_tables_rls.sql
-- Fix RLS policies for brand extraction tables
-- The FOR ALL policy with only USING clause doesn't work for INSERT operations

-- =============================================================================
-- brand_extractions - Fix RLS
-- =============================================================================
DROP POLICY IF EXISTS "Users can manage own brand_extractions" ON brand_extractions;

CREATE POLICY "brand_extractions_select"
  ON brand_extractions FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_extractions_insert"
  ON brand_extractions FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_extractions_update"
  ON brand_extractions FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_extractions_delete"
  ON brand_extractions FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- =============================================================================
-- brand_components - Fix RLS
-- =============================================================================
DROP POLICY IF EXISTS "Users can manage own brand_components" ON brand_components;

CREATE POLICY "brand_components_select"
  ON brand_components FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_components_insert"
  ON brand_components FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_components_update"
  ON brand_components FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_components_delete"
  ON brand_components FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- =============================================================================
-- brand_tokens - Fix RLS
-- =============================================================================
DROP POLICY IF EXISTS "Users can manage own brand_tokens" ON brand_tokens;

CREATE POLICY "brand_tokens_select"
  ON brand_tokens FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_tokens_insert"
  ON brand_tokens FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_tokens_update"
  ON brand_tokens FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_tokens_delete"
  ON brand_tokens FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- =============================================================================
-- brand_url_suggestions - Fix RLS
-- =============================================================================
DROP POLICY IF EXISTS "Users can manage own brand_url_suggestions" ON brand_url_suggestions;

CREATE POLICY "brand_url_suggestions_select"
  ON brand_url_suggestions FOR SELECT
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_url_suggestions_insert"
  ON brand_url_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_url_suggestions_update"
  ON brand_url_suggestions FOR UPDATE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "brand_url_suggestions_delete"
  ON brand_url_suggestions FOR DELETE
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
