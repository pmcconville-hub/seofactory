-- Migration: Fix Site Analysis RLS for Multi-Tenancy
-- Updates RLS policies to support organization-based access

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================

-- Check if user has access to a site analysis project
CREATE OR REPLACE FUNCTION has_site_analysis_project_access(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_linked_map_id UUID;
  v_linked_project_id UUID;
BEGIN
  -- Get project details
  SELECT user_id, linked_project_id
  INTO v_user_id, v_linked_map_id
  FROM site_analysis_projects
  WHERE id = p_project_id;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Direct owner check
  IF v_user_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

  -- If linked to a topical map, check map access via project
  IF v_linked_map_id IS NOT NULL THEN
    SELECT project_id INTO v_linked_project_id
    FROM topical_maps WHERE id = v_linked_map_id;

    IF v_linked_project_id IS NOT NULL AND has_project_access(v_linked_project_id) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Super admin check
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_site_analysis_project_access(UUID) TO authenticated;

-- ============================================================================
-- SITE_ANALYSIS_PROJECTS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own site analysis projects" ON site_analysis_projects;
DROP POLICY IF EXISTS "Users can insert own site analysis projects" ON site_analysis_projects;
DROP POLICY IF EXISTS "Users can update own site analysis projects" ON site_analysis_projects;
DROP POLICY IF EXISTS "Users can delete own site analysis projects" ON site_analysis_projects;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible site analysis projects"
  ON site_analysis_projects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (linked_project_id IS NOT NULL AND has_map_access(linked_project_id))
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert site analysis projects"
  ON site_analysis_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (linked_project_id IS NOT NULL AND has_map_access(linked_project_id))
  );

CREATE POLICY "Users can update accessible site analysis projects"
  ON site_analysis_projects FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (linked_project_id IS NOT NULL AND has_map_access(linked_project_id))
  );

CREATE POLICY "Users can delete accessible site analysis projects"
  ON site_analysis_projects FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (linked_project_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM topical_maps tm
          JOIN projects p ON p.id = tm.project_id
          WHERE tm.id = linked_project_id
            AND get_project_role(p.id) IN ('owner', 'admin')
        ))
  );

-- ============================================================================
-- SITE_ANALYSIS_PAGES RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own site analysis pages" ON site_analysis_pages;
DROP POLICY IF EXISTS "Users can insert own site analysis pages" ON site_analysis_pages;
DROP POLICY IF EXISTS "Users can update own site analysis pages" ON site_analysis_pages;
DROP POLICY IF EXISTS "Users can delete own site analysis pages" ON site_analysis_pages;
DROP POLICY IF EXISTS "Service role can manage site analysis pages" ON site_analysis_pages;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible site analysis pages"
  ON site_analysis_pages FOR SELECT
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can insert accessible site analysis pages"
  ON site_analysis_pages FOR INSERT
  TO authenticated
  WITH CHECK (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can update accessible site analysis pages"
  ON site_analysis_pages FOR UPDATE
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can delete accessible site analysis pages"
  ON site_analysis_pages FOR DELETE
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

-- Restore service role policy
CREATE POLICY "Service role can manage site analysis pages"
  ON site_analysis_pages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PAGE_AUDITS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own page audits" ON page_audits;
DROP POLICY IF EXISTS "Users can insert own page audits" ON page_audits;
DROP POLICY IF EXISTS "Users can update own page audits" ON page_audits;
DROP POLICY IF EXISTS "Users can delete own page audits" ON page_audits;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible page audits"
  ON page_audits FOR SELECT
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can insert accessible page audits"
  ON page_audits FOR INSERT
  TO authenticated
  WITH CHECK (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can update accessible page audits"
  ON page_audits FOR UPDATE
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can delete accessible page audits"
  ON page_audits FOR DELETE
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

-- ============================================================================
-- AUDIT_TASKS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own audit tasks" ON audit_tasks;
DROP POLICY IF EXISTS "Users can insert own audit tasks" ON audit_tasks;
DROP POLICY IF EXISTS "Users can update own audit tasks" ON audit_tasks;
DROP POLICY IF EXISTS "Users can delete own audit tasks" ON audit_tasks;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible audit tasks"
  ON audit_tasks FOR SELECT
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can insert accessible audit tasks"
  ON audit_tasks FOR INSERT
  TO authenticated
  WITH CHECK (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can update accessible audit tasks"
  ON audit_tasks FOR UPDATE
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

CREATE POLICY "Users can delete accessible audit tasks"
  ON audit_tasks FOR DELETE
  TO authenticated
  USING (has_site_analysis_project_access(project_id));

-- ============================================================================
-- CONTENT_GENERATION_SETTINGS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own settings" ON content_generation_settings;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible settings"
  ON content_generation_settings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (map_id IS NOT NULL AND has_map_access(map_id))
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert settings"
  ON content_generation_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (map_id IS NOT NULL AND has_map_access(map_id))
  );

CREATE POLICY "Users can update accessible settings"
  ON content_generation_settings FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (map_id IS NOT NULL AND has_map_access(map_id))
  );

CREATE POLICY "Users can delete accessible settings"
  ON content_generation_settings FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (map_id IS NOT NULL AND has_map_access(map_id))
  );

-- ============================================================================
-- INSIGHT_ACTIONS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own insight actions" ON insight_actions;
DROP POLICY IF EXISTS "Users can insert their own insight actions" ON insight_actions;
DROP POLICY IF EXISTS "Users can update their own insight actions" ON insight_actions;
DROP POLICY IF EXISTS "Users can delete their own insight actions" ON insight_actions;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible insight actions"
  ON insight_actions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (map_id IS NOT NULL AND has_map_access(map_id))
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert insight actions"
  ON insight_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (map_id IS NOT NULL AND has_map_access(map_id))
  );

CREATE POLICY "Users can update accessible insight actions"
  ON insight_actions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (map_id IS NOT NULL AND has_map_access(map_id))
  );

CREATE POLICY "Users can delete accessible insight actions"
  ON insight_actions FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (map_id IS NOT NULL AND has_map_access(map_id))
  );

-- ============================================================================
-- Done! Site analysis and related tables now support organization-based access
-- ============================================================================
