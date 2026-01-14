-- supabase/migrations/20260114000000_fix_foundation_pages_rls.sql
-- Fix RLS policies for foundation_pages and navigation_structures tables
-- to support organization-based multi-tenancy access

-- ============================================================================
-- FOUNDATION_PAGES RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own foundation pages" ON foundation_pages;
DROP POLICY IF EXISTS "Users can create own foundation pages" ON foundation_pages;
DROP POLICY IF EXISTS "Users can update own foundation pages" ON foundation_pages;
DROP POLICY IF EXISTS "Users can delete own foundation pages" ON foundation_pages;

-- Create new organization-aware policies using has_map_access
CREATE POLICY "Users can view accessible foundation pages"
  ON foundation_pages FOR SELECT
  TO authenticated
  USING (
    has_map_access(map_id)
    OR user_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert accessible foundation pages"
  ON foundation_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    has_map_access(map_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update accessible foundation pages"
  ON foundation_pages FOR UPDATE
  TO authenticated
  USING (
    has_map_access(map_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can delete accessible foundation pages"
  ON foundation_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = foundation_pages.map_id
        AND (
          get_project_role(p.id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
          OR foundation_pages.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- NAVIGATION_STRUCTURES RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own navigation" ON navigation_structures;
DROP POLICY IF EXISTS "Users can create own navigation" ON navigation_structures;
DROP POLICY IF EXISTS "Users can update own navigation" ON navigation_structures;
DROP POLICY IF EXISTS "Users can delete own navigation" ON navigation_structures;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible navigation"
  ON navigation_structures FOR SELECT
  TO authenticated
  USING (
    has_map_access(map_id)
    OR user_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert accessible navigation"
  ON navigation_structures FOR INSERT
  TO authenticated
  WITH CHECK (
    has_map_access(map_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update accessible navigation"
  ON navigation_structures FOR UPDATE
  TO authenticated
  USING (
    has_map_access(map_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can delete accessible navigation"
  ON navigation_structures FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = navigation_structures.map_id
        AND (
          get_project_role(p.id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
          OR navigation_structures.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- NAVIGATION_SYNC_STATUS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own sync status" ON navigation_sync_status;
DROP POLICY IF EXISTS "Users can create own sync status" ON navigation_sync_status;
DROP POLICY IF EXISTS "Users can update own sync status" ON navigation_sync_status;
DROP POLICY IF EXISTS "Users can delete own sync status" ON navigation_sync_status;

-- Create new organization-aware policies
CREATE POLICY "Users can view accessible sync status"
  ON navigation_sync_status FOR SELECT
  TO authenticated
  USING (
    has_map_access(map_id)
    OR public.is_super_admin()
  );

CREATE POLICY "Users can insert accessible sync status"
  ON navigation_sync_status FOR INSERT
  TO authenticated
  WITH CHECK (
    has_map_access(map_id)
  );

CREATE POLICY "Users can update accessible sync status"
  ON navigation_sync_status FOR UPDATE
  TO authenticated
  USING (
    has_map_access(map_id)
  );

CREATE POLICY "Users can delete accessible sync status"
  ON navigation_sync_status FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = navigation_sync_status.map_id
        AND get_project_role(p.id) IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Update create_foundation_pages function to use organization context
-- ============================================================================

-- The function already uses SECURITY DEFINER but we should ensure
-- it properly resolves user_id from the map context
CREATE OR REPLACE FUNCTION create_foundation_pages(
  p_map_id UUID,
  p_pages JSONB
)
RETURNS SETOF public.foundation_pages AS $$
DECLARE
  v_user_id UUID;
  v_page JSONB;
BEGIN
  -- Get user_id from topical_maps
  SELECT user_id INTO v_user_id FROM public.topical_maps WHERE id = p_map_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Map not found: %', p_map_id;
  END IF;

  -- Verify caller has access to this map
  IF NOT has_map_access(p_map_id) THEN
    RAISE EXCEPTION 'Access denied to map: %', p_map_id;
  END IF;

  -- Insert each page
  FOR v_page IN SELECT * FROM jsonb_array_elements(p_pages)
  LOOP
    RETURN QUERY
    INSERT INTO public.foundation_pages (
      map_id,
      user_id,
      page_type,
      title,
      slug,
      meta_description,
      h1_template,
      schema_type,
      sections,
      nap_data,
      metadata
    ) VALUES (
      p_map_id,
      v_user_id,
      v_page->>'page_type',
      v_page->>'title',
      v_page->>'slug',
      v_page->>'meta_description',
      v_page->>'h1_template',
      v_page->>'schema_type',
      v_page->'sections',
      v_page->'nap_data',
      v_page->'metadata'
    )
    ON CONFLICT (map_id, page_type) DO UPDATE SET
      title = EXCLUDED.title,
      slug = EXCLUDED.slug,
      meta_description = EXCLUDED.meta_description,
      h1_template = EXCLUDED.h1_template,
      schema_type = EXCLUDED.schema_type,
      sections = EXCLUDED.sections,
      nap_data = EXCLUDED.nap_data,
      metadata = EXCLUDED.metadata,
      deleted_at = NULL,
      deletion_reason = NULL,
      updated_at = NOW()
    RETURNING *;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Done! Foundation pages, navigation structures, and sync status now support
-- organization-based multi-tenancy access
-- ============================================================================
