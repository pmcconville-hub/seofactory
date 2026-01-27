-- supabase/migrations/20260127210000_fix_brand_design_tables_rls.sql
-- Fix RLS policies for ALL brand-related tables to use has_project_access()
-- Previous policies used: project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
-- This doesn't work for organization-owned projects.
-- Use has_project_access() helper function instead, which handles both org and user ownership.

-- =============================================================================
-- brand_design_dna - Fix RLS for organization access
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own brand_design_dna" ON brand_design_dna;
DROP POLICY IF EXISTS "Users can insert own brand_design_dna" ON brand_design_dna;
DROP POLICY IF EXISTS "Users can update own brand_design_dna" ON brand_design_dna;
DROP POLICY IF EXISTS "Users can delete own brand_design_dna" ON brand_design_dna;

CREATE POLICY "brand_design_dna_select"
  ON brand_design_dna FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_design_dna_insert"
  ON brand_design_dna FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_design_dna_update"
  ON brand_design_dna FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_design_dna_delete"
  ON brand_design_dna FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));

-- =============================================================================
-- brand_design_systems - Fix RLS for organization access
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own brand_design_systems" ON brand_design_systems;
DROP POLICY IF EXISTS "Users can insert own brand_design_systems" ON brand_design_systems;
DROP POLICY IF EXISTS "Users can update own brand_design_systems" ON brand_design_systems;
DROP POLICY IF EXISTS "Users can delete own brand_design_systems" ON brand_design_systems;

CREATE POLICY "brand_design_systems_select"
  ON brand_design_systems FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_design_systems_insert"
  ON brand_design_systems FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_design_systems_update"
  ON brand_design_systems FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_design_systems_delete"
  ON brand_design_systems FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));

-- =============================================================================
-- brand_extractions - Update to use has_project_access() for organization access
-- =============================================================================
DROP POLICY IF EXISTS "brand_extractions_select" ON brand_extractions;
DROP POLICY IF EXISTS "brand_extractions_insert" ON brand_extractions;
DROP POLICY IF EXISTS "brand_extractions_update" ON brand_extractions;
DROP POLICY IF EXISTS "brand_extractions_delete" ON brand_extractions;

CREATE POLICY "brand_extractions_select"
  ON brand_extractions FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_extractions_insert"
  ON brand_extractions FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_extractions_update"
  ON brand_extractions FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_extractions_delete"
  ON brand_extractions FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));

-- =============================================================================
-- brand_components - Update to use has_project_access() for organization access
-- =============================================================================
DROP POLICY IF EXISTS "brand_components_select" ON brand_components;
DROP POLICY IF EXISTS "brand_components_insert" ON brand_components;
DROP POLICY IF EXISTS "brand_components_update" ON brand_components;
DROP POLICY IF EXISTS "brand_components_delete" ON brand_components;

CREATE POLICY "brand_components_select"
  ON brand_components FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_components_insert"
  ON brand_components FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_components_update"
  ON brand_components FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_components_delete"
  ON brand_components FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));

-- =============================================================================
-- brand_tokens - Update to use has_project_access() for organization access
-- =============================================================================
DROP POLICY IF EXISTS "brand_tokens_select" ON brand_tokens;
DROP POLICY IF EXISTS "brand_tokens_insert" ON brand_tokens;
DROP POLICY IF EXISTS "brand_tokens_update" ON brand_tokens;
DROP POLICY IF EXISTS "brand_tokens_delete" ON brand_tokens;

CREATE POLICY "brand_tokens_select"
  ON brand_tokens FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_tokens_insert"
  ON brand_tokens FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_tokens_update"
  ON brand_tokens FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_tokens_delete"
  ON brand_tokens FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));

-- =============================================================================
-- brand_url_suggestions - Update to use has_project_access() for organization access
-- =============================================================================
DROP POLICY IF EXISTS "brand_url_suggestions_select" ON brand_url_suggestions;
DROP POLICY IF EXISTS "brand_url_suggestions_insert" ON brand_url_suggestions;
DROP POLICY IF EXISTS "brand_url_suggestions_update" ON brand_url_suggestions;
DROP POLICY IF EXISTS "brand_url_suggestions_delete" ON brand_url_suggestions;

CREATE POLICY "brand_url_suggestions_select"
  ON brand_url_suggestions FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_url_suggestions_insert"
  ON brand_url_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_url_suggestions_update"
  ON brand_url_suggestions FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_url_suggestions_delete"
  ON brand_url_suggestions FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));
