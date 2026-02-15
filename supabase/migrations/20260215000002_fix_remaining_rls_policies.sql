-- Fix semantic_analysis_results, unified_audit_snapshots, and audit_schedules RLS policies
-- These tables were created before the org migration and still use
-- the legacy projects.user_id = auth.uid() pattern.
-- Replace with has_project_access() which checks org membership + legacy ownership.

-- ============================================================================
-- SEMANTIC_ANALYSIS_RESULTS (access through site_inventory → projects)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view semantic results for their projects" ON public.semantic_analysis_results;
DROP POLICY IF EXISTS "Users can insert semantic results for their projects" ON public.semantic_analysis_results;
DROP POLICY IF EXISTS "Users can update semantic results for their projects" ON public.semantic_analysis_results;
DROP POLICY IF EXISTS "Users can delete semantic results for their projects" ON public.semantic_analysis_results;

CREATE POLICY "Users can view semantic results for their projects"
  ON public.semantic_analysis_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_inventory si
      WHERE si.id = semantic_analysis_results.inventory_id
        AND has_project_access(si.project_id)
    )
  );

CREATE POLICY "Users can insert semantic results for their projects"
  ON public.semantic_analysis_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_inventory si
      WHERE si.id = semantic_analysis_results.inventory_id
        AND has_project_access(si.project_id)
    )
  );

CREATE POLICY "Users can update semantic results for their projects"
  ON public.semantic_analysis_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_inventory si
      WHERE si.id = semantic_analysis_results.inventory_id
        AND has_project_access(si.project_id)
    )
  );

CREATE POLICY "Users can delete semantic results for their projects"
  ON public.semantic_analysis_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_inventory si
      WHERE si.id = semantic_analysis_results.inventory_id
        AND has_project_access(si.project_id)
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to semantic_analysis_results"
  ON public.semantic_analysis_results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- UNIFIED_AUDIT_SNAPSHOTS (direct project_id reference)
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own audit snapshots" ON public.unified_audit_snapshots;

CREATE POLICY "Users can view audit snapshots"
  ON public.unified_audit_snapshots FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Users can insert audit snapshots"
  ON public.unified_audit_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "Users can update audit snapshots"
  ON public.unified_audit_snapshots FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Users can delete audit snapshots"
  ON public.unified_audit_snapshots FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));

-- Service role bypass
CREATE POLICY "Service role full access to unified_audit_snapshots"
  ON public.unified_audit_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUDIT_SCHEDULES (direct project_id reference, also uses legacy pattern)
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own audit schedules" ON public.audit_schedules;

CREATE POLICY "Users can view audit schedules"
  ON public.audit_schedules FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Users can insert audit schedules"
  ON public.audit_schedules FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "Users can update audit schedules"
  ON public.audit_schedules FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Users can delete audit schedules"
  ON public.audit_schedules FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));

-- Service role bypass
CREATE POLICY "Service role full access to audit_schedules"
  ON public.audit_schedules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
