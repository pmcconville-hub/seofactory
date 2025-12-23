-- Admin Project Management
-- Allows admins to view all projects and reassign them to different users

-- ============================================
-- ADMIN RLS POLICIES FOR PROJECTS
-- ============================================

-- Admin can view all projects (bypasses user_id filter)
CREATE POLICY "Admin can view all projects"
  ON public.projects FOR SELECT
  USING (public.is_admin());

-- Admin can update any project (for reassignment)
CREATE POLICY "Admin can update all projects"
  ON public.projects FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- ADMIN RLS POLICIES FOR TOPICAL MAPS
-- ============================================

-- Admin can view all topical maps
CREATE POLICY "Admin can view all maps"
  ON public.topical_maps FOR SELECT
  USING (public.is_admin());

-- Admin can update any topical map (for user_id reassignment)
CREATE POLICY "Admin can update all maps"
  ON public.topical_maps FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- RPC: GET ALL PROJECTS WITH USER INFO (ADMIN ONLY)
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_get_all_projects()
RETURNS TABLE (
    id UUID,
    project_name TEXT,
    domain TEXT,
    user_id UUID,
    user_email TEXT,
    map_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.project_name,
        p.domain,
        p.user_id,
        u.email::TEXT as user_email,
        COALESCE(COUNT(tm.id), 0) as map_count,
        p.created_at,
        p.updated_at
    FROM public.projects p
    LEFT JOIN auth.users u ON u.id = p.user_id
    LEFT JOIN public.topical_maps tm ON tm.project_id = p.id
    GROUP BY p.id, p.project_name, p.domain, p.user_id, u.email, p.created_at, p.updated_at
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_get_all_projects() TO authenticated;

-- ============================================
-- RPC: REASSIGN PROJECT TO DIFFERENT USER (ADMIN ONLY)
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_reassign_project(
    p_project_id UUID,
    p_new_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_maps_updated INT := 0;
    v_old_user_id UUID;
    v_project_name TEXT;
BEGIN
    -- Verify caller is admin
    IF NOT public.is_admin() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Unauthorized: Admin role required'
        );
    END IF;

    -- Get current project info
    SELECT user_id, project_name INTO v_old_user_id, v_project_name
    FROM public.projects
    WHERE id = p_project_id;

    IF v_old_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Verify new user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_new_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Target user not found'
        );
    END IF;

    -- Update project owner
    UPDATE public.projects
    SET user_id = p_new_user_id, updated_at = NOW()
    WHERE id = p_project_id;

    -- Update all topical_maps for this project
    UPDATE public.topical_maps
    SET user_id = p_new_user_id, updated_at = NOW()
    WHERE project_id = p_project_id;
    GET DIAGNOSTICS v_maps_updated = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'project_id', p_project_id,
        'project_name', v_project_name,
        'old_user_id', v_old_user_id,
        'new_user_id', p_new_user_id,
        'maps_updated', v_maps_updated
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_reassign_project(UUID, UUID) TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.admin_get_all_projects() IS
    'Admin-only function to retrieve all projects with owner email and map count';

COMMENT ON FUNCTION public.admin_reassign_project(UUID, UUID) IS
    'Admin-only function to reassign a project and its maps to a different user';
