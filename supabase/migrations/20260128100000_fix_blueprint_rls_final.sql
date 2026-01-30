-- ============================================================================
-- FIX: Blueprint Tables RLS Policies - Final Fix
-- ============================================================================
-- The 406 errors suggest RLS policies are blocking access.
-- This migration recreates the policies with proper configuration.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "project_blueprints_select" ON project_blueprints;
DROP POLICY IF EXISTS "project_blueprints_insert" ON project_blueprints;
DROP POLICY IF EXISTS "project_blueprints_update" ON project_blueprints;
DROP POLICY IF EXISTS "project_blueprints_delete" ON project_blueprints;

DROP POLICY IF EXISTS "topical_map_blueprints_select" ON topical_map_blueprints;
DROP POLICY IF EXISTS "topical_map_blueprints_insert" ON topical_map_blueprints;
DROP POLICY IF EXISTS "topical_map_blueprints_update" ON topical_map_blueprints;
DROP POLICY IF EXISTS "topical_map_blueprints_delete" ON topical_map_blueprints;

DROP POLICY IF EXISTS "article_blueprints_select" ON article_blueprints;
DROP POLICY IF EXISTS "article_blueprints_insert" ON article_blueprints;
DROP POLICY IF EXISTS "article_blueprints_update" ON article_blueprints;
DROP POLICY IF EXISTS "article_blueprints_delete" ON article_blueprints;

DROP POLICY IF EXISTS "blueprint_history_select" ON blueprint_history;
DROP POLICY IF EXISTS "blueprint_history_insert" ON blueprint_history;

-- ============================================================================
-- STEP 2: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE project_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE topical_map_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create new RLS policies using has_project_access function
-- ============================================================================

-- project_blueprints policies
CREATE POLICY "project_blueprints_select" ON project_blueprints
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "project_blueprints_insert" ON project_blueprints
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "project_blueprints_update" ON project_blueprints
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id))
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "project_blueprints_delete" ON project_blueprints
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- topical_map_blueprints policies
CREATE POLICY "topical_map_blueprints_select" ON topical_map_blueprints
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "topical_map_blueprints_insert" ON topical_map_blueprints
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "topical_map_blueprints_update" ON topical_map_blueprints
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id))
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "topical_map_blueprints_delete" ON topical_map_blueprints
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- article_blueprints policies (use topical_map_id to check access via topical_maps)
CREATE POLICY "article_blueprints_select" ON article_blueprints
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = article_blueprints.topical_map_id
      AND has_project_access(p.id)
    )
  );

CREATE POLICY "article_blueprints_insert" ON article_blueprints
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = article_blueprints.topical_map_id
      AND has_project_access(p.id)
    )
  );

CREATE POLICY "article_blueprints_update" ON article_blueprints
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = article_blueprints.topical_map_id
      AND has_project_access(p.id)
    )
  );

CREATE POLICY "article_blueprints_delete" ON article_blueprints
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = article_blueprints.topical_map_id
      AND has_project_access(p.id)
    )
  );

-- blueprint_history policies (via article_blueprints)
CREATE POLICY "blueprint_history_select" ON blueprint_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM article_blueprints ab
      JOIN topical_maps tm ON tm.id = ab.topical_map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE ab.id = blueprint_history.article_blueprint_id
      AND has_project_access(p.id)
    )
  );

CREATE POLICY "blueprint_history_insert" ON blueprint_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM article_blueprints ab
      JOIN topical_maps tm ON tm.id = ab.topical_map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE ab.id = blueprint_history.article_blueprint_id
      AND has_project_access(p.id)
    )
  );

-- ============================================================================
-- STEP 4: Notify PostgREST to reload schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- STEP 5: Grant permissions to authenticated role
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON project_blueprints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON topical_map_blueprints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON article_blueprints TO authenticated;
GRANT SELECT, INSERT ON blueprint_history TO authenticated;
