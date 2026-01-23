-- ============================================================================
-- Fix Blueprint RLS Policies to Use Helper Functions
-- ============================================================================
-- The original blueprint RLS policies used direct user_id checks which don't
-- work with the organization-based ownership model. This migration updates
-- them to use the has_project_access() and get_project_role() helper functions.
-- ============================================================================

-- ============================================================================
-- DROP OLD POLICIES
-- ============================================================================

-- Project blueprints
DROP POLICY IF EXISTS project_blueprints_select ON project_blueprints;
DROP POLICY IF EXISTS project_blueprints_insert ON project_blueprints;
DROP POLICY IF EXISTS project_blueprints_update ON project_blueprints;
DROP POLICY IF EXISTS project_blueprints_delete ON project_blueprints;

-- Topical map blueprints
DROP POLICY IF EXISTS topical_map_blueprints_select ON topical_map_blueprints;
DROP POLICY IF EXISTS topical_map_blueprints_insert ON topical_map_blueprints;
DROP POLICY IF EXISTS topical_map_blueprints_update ON topical_map_blueprints;
DROP POLICY IF EXISTS topical_map_blueprints_delete ON topical_map_blueprints;

-- Article blueprints
DROP POLICY IF EXISTS article_blueprints_select ON article_blueprints;
DROP POLICY IF EXISTS article_blueprints_insert ON article_blueprints;
DROP POLICY IF EXISTS article_blueprints_update ON article_blueprints;
DROP POLICY IF EXISTS article_blueprints_delete ON article_blueprints;

-- Blueprint history
DROP POLICY IF EXISTS blueprint_history_select ON blueprint_history;
DROP POLICY IF EXISTS blueprint_history_insert ON blueprint_history;

-- ============================================================================
-- PROJECT BLUEPRINTS - New Policies
-- ============================================================================

CREATE POLICY project_blueprints_select ON project_blueprints
  FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY project_blueprints_insert ON project_blueprints
  FOR INSERT
  TO authenticated
  WITH CHECK (get_project_role(project_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY project_blueprints_update ON project_blueprints
  FOR UPDATE
  TO authenticated
  USING (get_project_role(project_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY project_blueprints_delete ON project_blueprints
  FOR DELETE
  TO authenticated
  USING (get_project_role(project_id) IN ('owner', 'admin'));

-- ============================================================================
-- TOPICAL MAP BLUEPRINTS - New Policies
-- ============================================================================

CREATE POLICY topical_map_blueprints_select ON topical_map_blueprints
  FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY topical_map_blueprints_insert ON topical_map_blueprints
  FOR INSERT
  TO authenticated
  WITH CHECK (get_project_role(project_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY topical_map_blueprints_update ON topical_map_blueprints
  FOR UPDATE
  TO authenticated
  USING (get_project_role(project_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY topical_map_blueprints_delete ON topical_map_blueprints
  FOR DELETE
  TO authenticated
  USING (get_project_role(project_id) IN ('owner', 'admin'));

-- ============================================================================
-- ARTICLE BLUEPRINTS - New Policies
-- ============================================================================

-- Helper function to get project_id from topical_map_id
CREATE OR REPLACE FUNCTION get_project_id_from_map(map_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT project_id FROM topical_maps WHERE id = map_id;
$$;

CREATE POLICY article_blueprints_select ON article_blueprints
  FOR SELECT
  TO authenticated
  USING (has_project_access(get_project_id_from_map(topical_map_id)));

CREATE POLICY article_blueprints_insert ON article_blueprints
  FOR INSERT
  TO authenticated
  WITH CHECK (get_project_role(get_project_id_from_map(topical_map_id)) IN ('owner', 'admin', 'editor'));

CREATE POLICY article_blueprints_update ON article_blueprints
  FOR UPDATE
  TO authenticated
  USING (get_project_role(get_project_id_from_map(topical_map_id)) IN ('owner', 'admin', 'editor'));

CREATE POLICY article_blueprints_delete ON article_blueprints
  FOR DELETE
  TO authenticated
  USING (get_project_role(get_project_id_from_map(topical_map_id)) IN ('owner', 'admin'));

-- ============================================================================
-- BLUEPRINT HISTORY - New Policies
-- ============================================================================

-- Helper function to get project_id from article_blueprint_id
CREATE OR REPLACE FUNCTION get_project_id_from_blueprint(bp_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT get_project_id_from_map(ab.topical_map_id)
  FROM article_blueprints ab
  WHERE ab.id = bp_id;
$$;

CREATE POLICY blueprint_history_select ON blueprint_history
  FOR SELECT
  TO authenticated
  USING (has_project_access(get_project_id_from_blueprint(article_blueprint_id)));

CREATE POLICY blueprint_history_insert ON blueprint_history
  FOR INSERT
  TO authenticated
  WITH CHECK (get_project_role(get_project_id_from_blueprint(article_blueprint_id)) IN ('owner', 'admin', 'editor'));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_project_id_from_map IS 'Helper to resolve topical_map_id to project_id for RLS';
COMMENT ON FUNCTION get_project_id_from_blueprint IS 'Helper to resolve article_blueprint_id to project_id for RLS';
