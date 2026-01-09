-- supabase/migrations/20260110200000_project_members_table.sql
-- External collaborators for projects (Phase 2)

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role for THIS project (independent of org role)
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  permission_overrides JSONB DEFAULT '{}',

  -- Source tracking
  source TEXT DEFAULT 'direct' CHECK (source IN ('org_member', 'direct', 'invitation')),

  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_pending ON project_members(project_id) WHERE accepted_at IS NULL;

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_members
CREATE POLICY "Project members can view other members"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    has_project_access(project_id) OR user_id = auth.uid()
  );

CREATE POLICY "Project admins can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    get_project_role(project_id) IN ('owner', 'admin')
    OR (user_id = auth.uid() AND source = 'invitation')
  );

CREATE POLICY "Project admins can update members"
  ON project_members FOR UPDATE
  TO authenticated
  USING (
    get_project_role(project_id) IN ('owner', 'admin')
    OR (user_id = auth.uid() AND accepted_at IS NULL)
  );

CREATE POLICY "Project admins can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    get_project_role(project_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );

-- Update has_project_access to include project_members
CREATE OR REPLACE FUNCTION has_project_access(proj_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check via organization membership
  IF EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
      AND om.user_id = auth.uid()
      AND om.accepted_at IS NOT NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check via direct project membership (external collaborators)
  IF EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = proj_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback: check old user_id pattern (backward compatibility)
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = proj_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_project_role to include project_members
CREATE OR REPLACE FUNCTION get_project_role(proj_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_direct_role TEXT;
  v_org_role TEXT;
BEGIN
  -- Direct project role takes precedence
  SELECT role INTO v_direct_role
  FROM project_members
  WHERE project_id = proj_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;

  IF v_direct_role IS NOT NULL THEN
    RETURN v_direct_role;
  END IF;

  -- Fall back to organization role
  SELECT om.role INTO v_org_role
  FROM projects p
  JOIN organization_members om ON om.organization_id = p.organization_id
  WHERE p.id = proj_id
    AND om.user_id = auth.uid()
    AND om.accepted_at IS NOT NULL;

  IF v_org_role IS NOT NULL THEN
    RETURN v_org_role;
  END IF;

  -- Fallback: if user owns via old pattern, treat as owner
  IF EXISTS (SELECT 1 FROM projects WHERE id = proj_id AND user_id = auth.uid()) THEN
    RETURN 'owner';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
