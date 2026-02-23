-- ============================================================================
-- FIX: Assign organization_id to orphaned projects + add Bram to Richard's org
-- ============================================================================
-- Context: Projects created before the org system was introduced have
-- organization_id = NULL. This breaks has_project_access() for non-owner
-- users because all org-based checks fail.
--
-- Fix 1: Set organization_id to the owner's personal org for orphaned projects.
-- Fix 2: Add Bram as editor in Richard's org so he can access shared projects.
-- Fix 3: Update create_new_project() to always set organization_id.
-- ============================================================================

-- Fix 1: Set organization_id to owner's personal org for all orphaned projects
UPDATE projects p
SET organization_id = o.id
FROM organizations o
WHERE p.organization_id IS NULL
  AND o.owner_id = p.user_id
  AND o.type = 'personal';

-- Fix 2: Add Bram as editor in Richard's organization
INSERT INTO organization_members (organization_id, user_id, role, accepted_at)
VALUES (
  '02bedb11-469a-4145-9286-03f49f18a032',  -- Richard's personal org
  '35c8bd96-dc1a-4cbd-af5d-c6fdf6bdcd64',  -- Bram's user_id
  'editor',
  NOW()
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Fix 3: Update create_new_project() to always set organization_id
-- Looks up the user's personal org and sets it on project creation
CREATE OR REPLACE FUNCTION public.create_new_project(p_project_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_project public.projects%ROWTYPE;
  v_user_id UUID;
  v_project_name TEXT;
  v_domain TEXT;
  v_org_id UUID;
BEGIN
  -- Extract parameters from JSONB
  v_user_id := (p_project_data->>'user_id')::UUID;
  v_project_name := p_project_data->>'project_name';
  v_domain := p_project_data->>'domain';

  -- Verify the user_id matches the authenticated user
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch: cannot create project for another user';
  END IF;

  -- Look up the user's personal organization
  SELECT id INTO v_org_id
  FROM organizations
  WHERE owner_id = v_user_id AND type = 'personal'
  LIMIT 1;

  -- Insert the new project with organization_id
  INSERT INTO public.projects (user_id, project_name, domain, organization_id)
  VALUES (v_user_id, v_project_name, v_domain, v_org_id)
  RETURNING * INTO v_new_project;

  -- Return the new project as JSONB
  RETURN jsonb_build_object(
    'id', v_new_project.id,
    'user_id', v_new_project.user_id,
    'project_name', v_new_project.project_name,
    'domain', v_new_project.domain,
    'organization_id', v_new_project.organization_id,
    'created_at', v_new_project.created_at,
    'updated_at', v_new_project.updated_at
  );
END;
$$;

-- Ensure permissions are preserved
GRANT EXECUTE ON FUNCTION public.create_new_project(JSONB) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
