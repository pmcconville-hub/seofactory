-- supabase/migrations/20260110200001_invitations_table.sql
-- Invitation system for organizations and projects (Phase 2)

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What type of invitation
  type TEXT NOT NULL CHECK (type IN ('organization', 'project')),

  -- Target (one will be set based on type)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Invitee
  email TEXT NOT NULL,
  role TEXT NOT NULL,  -- Role to assign upon acceptance

  -- Security (use UUID without dashes as token - 32 hex chars)
  token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),

  -- Metadata
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT,  -- Optional personal message

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,

  -- Constraints
  CHECK (
    (type = 'organization' AND organization_id IS NOT NULL AND project_id IS NULL) OR
    (type = 'project' AND project_id IS NOT NULL)
  )
);

CREATE INDEX idx_invitations_email ON invitations(email) WHERE accepted_at IS NULL AND declined_at IS NULL;
CREATE INDEX idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL AND declined_at IS NULL;
CREATE INDEX idx_invitations_org ON invitations(organization_id) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_project ON invitations(project_id) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by, created_at DESC);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations they sent"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR (type = 'organization' AND get_org_role(organization_id) IN ('owner', 'admin'))
    OR (type = 'project' AND get_project_role(project_id) IN ('owner', 'admin'))
  );

CREATE POLICY "Org/project admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND (
      (type = 'organization' AND get_org_role(organization_id) IN ('owner', 'admin'))
      OR (type = 'project' AND get_project_role(project_id) IN ('owner', 'admin'))
    )
  );

CREATE POLICY "Inviters can update their invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR (type = 'organization' AND get_org_role(organization_id) IN ('owner', 'admin'))
    OR (type = 'project' AND get_project_role(project_id) IN ('owner', 'admin'))
  );

CREATE POLICY "Inviters can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR (type = 'organization' AND get_org_role(organization_id) IN ('owner', 'admin'))
    OR (type = 'project' AND get_project_role(project_id) IN ('owner', 'admin'))
  );

-- Function to accept an invitation by token
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get and validate invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND declined_at IS NULL
    AND expires_at > NOW();

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Create membership based on type
  IF v_invitation.type = 'organization' THEN
    INSERT INTO organization_members (
      organization_id, user_id, role, invited_by, invited_at, accepted_at
    ) VALUES (
      v_invitation.organization_id,
      v_user_id,
      v_invitation.role,
      v_invitation.invited_by,
      v_invitation.created_at,
      NOW()
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        accepted_at = NOW();

    v_result := jsonb_build_object(
      'success', true,
      'type', 'organization',
      'organization_id', v_invitation.organization_id
    );
  ELSE
    INSERT INTO project_members (
      project_id, user_id, role, source, invited_by, invited_at, accepted_at
    ) VALUES (
      v_invitation.project_id,
      v_user_id,
      v_invitation.role,
      'invitation',
      v_invitation.invited_by,
      v_invitation.created_at,
      NOW()
    )
    ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        accepted_at = NOW();

    v_result := jsonb_build_object(
      'success', true,
      'type', 'project',
      'project_id', v_invitation.project_id
    );
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Log audit event
  PERFORM log_audit_event(
    COALESCE(v_invitation.organization_id, (SELECT organization_id FROM projects WHERE id = v_invitation.project_id)),
    'invitation.accepted',
    v_invitation.type,
    COALESCE(v_invitation.organization_id, v_invitation.project_id),
    v_invitation.email,
    NULL,
    jsonb_build_object('role', v_invitation.role, 'invited_by', v_invitation.invited_by)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline an invitation
CREATE OR REPLACE FUNCTION decline_invitation(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND declined_at IS NULL;

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation';
  END IF;

  -- Mark as declined
  UPDATE invitations
  SET declined_at = NOW()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'type', v_invitation.type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION decline_invitation TO authenticated;
