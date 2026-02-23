-- ============================================================================
-- FIX: Update 12 tables from legacy auth.uid() = user_id RLS to org-aware access
-- ============================================================================
-- These tables were created before org-based multi-tenancy was added.
-- All use auth.uid() = user_id which blocks organization members from
-- accessing shared project data. Updates to use has_project_access() via
-- the topical_maps → projects chain (same pattern as topics, content_briefs).
--
-- Tables with map_id: linking_audit_results, query_network_audits,
--   eat_scanner_audits, corpus_audits, enhanced_metrics_snapshots, score_history
-- Tables with topic_id: topic_serp_analysis
-- Tables with both map_id + topic_id: premium_designs
-- WordPress tables: wordpress_media, wordpress_analytics, publication_history
--   (chain through wordpress_connections which has project_id)
-- Skipped: style_guides (user-level, not project-scoped)
-- ============================================================================

-- ============================================================================
-- LINKING_AUDIT_RESULTS (has map_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own audit results" ON linking_audit_results;
DROP POLICY IF EXISTS "Users can insert own audit results" ON linking_audit_results;
DROP POLICY IF EXISTS "Users can update own audit results" ON linking_audit_results;
DROP POLICY IF EXISTS "Users can delete own audit results" ON linking_audit_results;

CREATE POLICY "Users can view accessible audit results"
  ON linking_audit_results FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = linking_audit_results.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible audit results"
  ON linking_audit_results FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = linking_audit_results.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update accessible audit results"
  ON linking_audit_results FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = linking_audit_results.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete accessible audit results"
  ON linking_audit_results FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = linking_audit_results.map_id
        AND (get_project_role(p.id) IN ('owner', 'admin') OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- LINKING_FIX_HISTORY (chains through audit_id → linking_audit_results → map_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own fix history" ON linking_fix_history;
DROP POLICY IF EXISTS "Users can insert own fix history" ON linking_fix_history;
DROP POLICY IF EXISTS "Users can update own fix history" ON linking_fix_history;

CREATE POLICY "Users can view accessible fix history"
  ON linking_fix_history FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM linking_audit_results lar
      JOIN topical_maps tm ON tm.id = lar.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE lar.id = linking_fix_history.audit_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible fix history"
  ON linking_fix_history FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM linking_audit_results lar
      JOIN topical_maps tm ON tm.id = lar.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE lar.id = linking_fix_history.audit_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update accessible fix history"
  ON linking_fix_history FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM linking_audit_results lar
      JOIN topical_maps tm ON tm.id = lar.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE lar.id = linking_fix_history.audit_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- QUERY_NETWORK_AUDITS (has map_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own audits" ON query_network_audits;
DROP POLICY IF EXISTS "Users can insert own audits" ON query_network_audits;
DROP POLICY IF EXISTS "Users can delete own audits" ON query_network_audits;

CREATE POLICY "Users can view accessible network audits"
  ON query_network_audits FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = query_network_audits.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible network audits"
  ON query_network_audits FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = query_network_audits.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete accessible network audits"
  ON query_network_audits FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = query_network_audits.map_id
        AND (get_project_role(p.id) IN ('owner', 'admin') OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- EAT_SCANNER_AUDITS (has map_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own eat audits" ON eat_scanner_audits;
DROP POLICY IF EXISTS "Users can insert own eat audits" ON eat_scanner_audits;
DROP POLICY IF EXISTS "Users can delete own eat audits" ON eat_scanner_audits;

CREATE POLICY "Users can view accessible eat audits"
  ON eat_scanner_audits FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = eat_scanner_audits.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible eat audits"
  ON eat_scanner_audits FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = eat_scanner_audits.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete accessible eat audits"
  ON eat_scanner_audits FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = eat_scanner_audits.map_id
        AND (get_project_role(p.id) IN ('owner', 'admin') OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- CORPUS_AUDITS (has map_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own corpus audits" ON corpus_audits;
DROP POLICY IF EXISTS "Users can insert own corpus audits" ON corpus_audits;
DROP POLICY IF EXISTS "Users can delete own corpus audits" ON corpus_audits;

CREATE POLICY "Users can view accessible corpus audits"
  ON corpus_audits FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = corpus_audits.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible corpus audits"
  ON corpus_audits FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = corpus_audits.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete accessible corpus audits"
  ON corpus_audits FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = corpus_audits.map_id
        AND (get_project_role(p.id) IN ('owner', 'admin') OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- ENHANCED_METRICS_SNAPSHOTS (has map_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own snapshots" ON enhanced_metrics_snapshots;
DROP POLICY IF EXISTS "Users can insert own snapshots" ON enhanced_metrics_snapshots;
DROP POLICY IF EXISTS "Users can update own snapshots" ON enhanced_metrics_snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots" ON enhanced_metrics_snapshots;

CREATE POLICY "Users can view accessible snapshots"
  ON enhanced_metrics_snapshots FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = enhanced_metrics_snapshots.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible snapshots"
  ON enhanced_metrics_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = enhanced_metrics_snapshots.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update accessible snapshots"
  ON enhanced_metrics_snapshots FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = enhanced_metrics_snapshots.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete accessible snapshots"
  ON enhanced_metrics_snapshots FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = enhanced_metrics_snapshots.map_id
        AND (get_project_role(p.id) IN ('owner', 'admin') OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- TOPIC_SERP_ANALYSIS (has topic_id → topics → topical_maps → projects)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own serp analysis" ON topic_serp_analysis;
DROP POLICY IF EXISTS "Users can insert own serp analysis" ON topic_serp_analysis;
DROP POLICY IF EXISTS "Users can update own serp analysis" ON topic_serp_analysis;
DROP POLICY IF EXISTS "Users can delete own serp analysis" ON topic_serp_analysis;

CREATE POLICY "Users can view accessible serp analysis"
  ON topic_serp_analysis FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topics t
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE t.id = topic_serp_analysis.topic_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible serp analysis"
  ON topic_serp_analysis FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topics t
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE t.id = topic_serp_analysis.topic_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update accessible serp analysis"
  ON topic_serp_analysis FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topics t
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE t.id = topic_serp_analysis.topic_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete accessible serp analysis"
  ON topic_serp_analysis FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topics t
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE t.id = topic_serp_analysis.topic_id
        AND (get_project_role(p.id) IN ('owner', 'admin') OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- SCORE_HISTORY (has map_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own scores" ON score_history;
DROP POLICY IF EXISTS "Users can insert own scores" ON score_history;
DROP POLICY IF EXISTS "Users can delete own scores" ON score_history;

CREATE POLICY "Users can view accessible scores"
  ON score_history FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = score_history.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible scores"
  ON score_history FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = score_history.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete accessible scores"
  ON score_history FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = score_history.map_id
        AND (get_project_role(p.id) IN ('owner', 'admin') OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- PREMIUM_DESIGNS (has map_id and topic_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own designs" ON premium_designs;
DROP POLICY IF EXISTS "Users can insert own designs" ON premium_designs;
DROP POLICY IF EXISTS "Users can update own designs" ON premium_designs;
DROP POLICY IF EXISTS "Users can delete own designs" ON premium_designs;

CREATE POLICY "Users can view accessible designs"
  ON premium_designs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = premium_designs.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid() OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible designs"
  ON premium_designs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = premium_designs.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update accessible designs"
  ON premium_designs FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = premium_designs.map_id
        AND (has_project_access(p.id) OR tm.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete accessible designs"
  ON premium_designs FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = premium_designs.map_id
        AND (get_project_role(p.id) IN ('owner', 'admin') OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- WORDPRESS TABLES
-- These chain through wordpress_connections which has project_id.
-- Current policies chain: ... → wordpress_connections.user_id = auth.uid()
-- Updated to also check has_project_access(project_id) on the connection.
-- ============================================================================

-- WORDPRESS_MEDIA (connection_id → wordpress_connections)
DROP POLICY IF EXISTS "Users can view own media" ON wordpress_media;
DROP POLICY IF EXISTS "Users can insert own media" ON wordpress_media;
DROP POLICY IF EXISTS "Users can update own media" ON wordpress_media;
DROP POLICY IF EXISTS "Users can delete own media" ON wordpress_media;

CREATE POLICY "Users can view accessible media"
  ON wordpress_media FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_connections wc
      WHERE wc.id = wordpress_media.connection_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible media"
  ON wordpress_media FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wordpress_connections wc
      WHERE wc.id = wordpress_media.connection_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id))
    )
  );

CREATE POLICY "Users can update accessible media"
  ON wordpress_media FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_connections wc
      WHERE wc.id = wordpress_media.connection_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id))
    )
  );

CREATE POLICY "Users can delete accessible media"
  ON wordpress_media FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_connections wc
      WHERE wc.id = wordpress_media.connection_id
        AND (wc.user_id = auth.uid() OR get_project_role(wc.project_id) IN ('owner', 'admin'))
    )
  );

-- WORDPRESS_ANALYTICS (publication_id → wordpress_publications → connection_id → wordpress_connections)
DROP POLICY IF EXISTS "Users can view own analytics" ON wordpress_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON wordpress_analytics;
DROP POLICY IF EXISTS "Users can update own analytics" ON wordpress_analytics;
DROP POLICY IF EXISTS "Users can delete own analytics" ON wordpress_analytics;

CREATE POLICY "Users can view accessible analytics"
  ON wordpress_analytics FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_publications wp
      JOIN wordpress_connections wc ON wc.id = wp.connection_id
      WHERE wp.id = wordpress_analytics.publication_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible analytics"
  ON wordpress_analytics FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wordpress_publications wp
      JOIN wordpress_connections wc ON wc.id = wp.connection_id
      WHERE wp.id = wordpress_analytics.publication_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id))
    )
  );

CREATE POLICY "Users can update accessible analytics"
  ON wordpress_analytics FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_publications wp
      JOIN wordpress_connections wc ON wc.id = wp.connection_id
      WHERE wp.id = wordpress_analytics.publication_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id))
    )
  );

CREATE POLICY "Users can delete accessible analytics"
  ON wordpress_analytics FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_publications wp
      JOIN wordpress_connections wc ON wc.id = wp.connection_id
      WHERE wp.id = wordpress_analytics.publication_id
        AND (wc.user_id = auth.uid() OR get_project_role(wc.project_id) IN ('owner', 'admin'))
    )
  );

-- PUBLICATION_HISTORY (publication_id → wordpress_publications → connection_id → wordpress_connections)
DROP POLICY IF EXISTS "Users can view own pub history" ON publication_history;
DROP POLICY IF EXISTS "Users can insert own pub history" ON publication_history;
DROP POLICY IF EXISTS "Users can update own pub history" ON publication_history;
DROP POLICY IF EXISTS "Users can delete own pub history" ON publication_history;

CREATE POLICY "Users can view accessible pub history"
  ON publication_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_publications wp
      JOIN wordpress_connections wc ON wc.id = wp.connection_id
      WHERE wp.id = publication_history.publication_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "Users can insert accessible pub history"
  ON publication_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wordpress_publications wp
      JOIN wordpress_connections wc ON wc.id = wp.connection_id
      WHERE wp.id = publication_history.publication_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id))
    )
  );

CREATE POLICY "Users can update accessible pub history"
  ON publication_history FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_publications wp
      JOIN wordpress_connections wc ON wc.id = wp.connection_id
      WHERE wp.id = publication_history.publication_id
        AND (wc.user_id = auth.uid() OR has_project_access(wc.project_id))
    )
  );

CREATE POLICY "Users can delete accessible pub history"
  ON publication_history FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wordpress_publications wp
      JOIN wordpress_connections wc ON wc.id = wp.connection_id
      WHERE wp.id = publication_history.publication_id
        AND (wc.user_id = auth.uid() OR get_project_role(wc.project_id) IN ('owner', 'admin'))
    )
  );

-- ============================================================================
-- NOTE: style_guides is skipped — it's user-level (no project/map/topic link)
-- ============================================================================

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
