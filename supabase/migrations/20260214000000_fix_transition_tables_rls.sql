-- Fix site_inventory and transition_snapshots RLS policies
-- These tables were created before the org migration and still use
-- the legacy projects.user_id = auth.uid() pattern.
-- Replace with has_project_access() which checks org membership + legacy ownership.

-- ============================================================================
-- SITE_INVENTORY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view inventory for their projects" ON public.site_inventory;
DROP POLICY IF EXISTS "Users can insert inventory for their projects" ON public.site_inventory;
DROP POLICY IF EXISTS "Users can update inventory for their projects" ON public.site_inventory;
DROP POLICY IF EXISTS "Users can delete inventory for their projects" ON public.site_inventory;

CREATE POLICY "Users can view inventory for their projects"
  ON public.site_inventory FOR SELECT
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Users can insert inventory for their projects"
  ON public.site_inventory FOR INSERT
  TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "Users can update inventory for their projects"
  ON public.site_inventory FOR UPDATE
  TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "Users can delete inventory for their projects"
  ON public.site_inventory FOR DELETE
  TO authenticated
  USING (has_project_access(project_id));

-- Service role bypass
CREATE POLICY "Service role full access to site_inventory"
  ON public.site_inventory FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRANSITION_SNAPSHOTS (access through site_inventory → projects)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view snapshots for their projects" ON public.transition_snapshots;
DROP POLICY IF EXISTS "Users can insert snapshots for their projects" ON public.transition_snapshots;
DROP POLICY IF EXISTS "Users can update snapshots for their projects" ON public.transition_snapshots;
DROP POLICY IF EXISTS "Users can delete snapshots for their projects" ON public.transition_snapshots;

CREATE POLICY "Users can view snapshots for their projects"
  ON public.transition_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_inventory si
      WHERE si.id = transition_snapshots.inventory_id
        AND has_project_access(si.project_id)
    )
  );

CREATE POLICY "Users can insert snapshots for their projects"
  ON public.transition_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_inventory si
      WHERE si.id = transition_snapshots.inventory_id
        AND has_project_access(si.project_id)
    )
  );

CREATE POLICY "Users can update snapshots for their projects"
  ON public.transition_snapshots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_inventory si
      WHERE si.id = transition_snapshots.inventory_id
        AND has_project_access(si.project_id)
    )
  );

CREATE POLICY "Users can delete snapshots for their projects"
  ON public.transition_snapshots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.site_inventory si
      WHERE si.id = transition_snapshots.inventory_id
        AND has_project_access(si.project_id)
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to transition_snapshots"
  ON public.transition_snapshots FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
