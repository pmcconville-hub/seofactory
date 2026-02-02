-- Fix brand table RLS: delegate access control to the projects table
--
-- ROOT CAUSE: Previous migrations used has_project_access() or direct
-- ownership/org checks that didn't cover all access paths (JWT metadata,
-- project_members, etc.). Meanwhile the projects table RLS works correctly.
--
-- SOLUTION: Use "project_id IN (SELECT id FROM projects)" which leverages
-- the projects table's own RLS policies. If a user can see a project,
-- they can access its brand data. Simple, correct, and future-proof.

-- ============================================================================
-- brand_url_suggestions
-- ============================================================================
DO $$ BEGIN DROP POLICY IF EXISTS "brand_url_suggestions_select" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_url_suggestions_insert" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_url_suggestions_update" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_url_suggestions_delete" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE brand_url_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_url_suggestions_select" ON brand_url_suggestions
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_url_suggestions_insert" ON brand_url_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_url_suggestions_update" ON brand_url_suggestions
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_url_suggestions_delete" ON brand_url_suggestions
  FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

-- ============================================================================
-- brand_components
-- ============================================================================
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_select" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_insert" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_update" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_delete" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE brand_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_components_select" ON brand_components
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_components_insert" ON brand_components
  FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_components_update" ON brand_components
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_components_delete" ON brand_components
  FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

-- ============================================================================
-- brand_tokens
-- ============================================================================
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_select" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_insert" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_update" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_delete" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE brand_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_tokens_select" ON brand_tokens
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_tokens_insert" ON brand_tokens
  FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_tokens_update" ON brand_tokens
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_tokens_delete" ON brand_tokens
  FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

-- ============================================================================
-- brand_design_dna
-- ============================================================================
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_dna_select" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_dna_insert" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_dna_update" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_dna_delete" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE brand_design_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_design_dna_select" ON brand_design_dna
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_design_dna_insert" ON brand_design_dna
  FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_design_dna_update" ON brand_design_dna
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_design_dna_delete" ON brand_design_dna
  FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

-- ============================================================================
-- brand_design_systems
-- ============================================================================
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_systems_select" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_systems_insert" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_systems_update" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_systems_delete" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE brand_design_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_design_systems_select" ON brand_design_systems
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_design_systems_insert" ON brand_design_systems
  FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_design_systems_update" ON brand_design_systems
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM projects));

CREATE POLICY "brand_design_systems_delete" ON brand_design_systems
  FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects));
