-- supabase/migrations/20260110200002_invitation_rate_limiting.sql
-- Rate limiting for invitations (Phase 2)

-- Rate limit function
CREATE OR REPLACE FUNCTION check_invitation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INT;
  v_org_limit INT := 20;  -- 20 invitations per hour per org
  v_user_limit INT := 50; -- 50 invitations per hour per user
BEGIN
  -- Check org-level rate limit (only for org invitations)
  IF NEW.organization_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM invitations
    WHERE organization_id = NEW.organization_id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent_count >= v_org_limit THEN
      RAISE EXCEPTION 'Organization invitation rate limit exceeded (% per hour)', v_org_limit;
    END IF;
  END IF;

  -- Check project-level rate limit (only for project invitations)
  IF NEW.project_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM invitations
    WHERE project_id = NEW.project_id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_recent_count >= v_org_limit THEN
      RAISE EXCEPTION 'Project invitation rate limit exceeded (% per hour)', v_org_limit;
    END IF;
  END IF;

  -- Check user-level rate limit
  SELECT COUNT(*) INTO v_recent_count
  FROM invitations
  WHERE invited_by = NEW.invited_by
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= v_user_limit THEN
    RAISE EXCEPTION 'User invitation rate limit exceeded (% per hour)', v_user_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invitation_rate_limit
  BEFORE INSERT ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_invitation_rate_limit();

-- Prevent duplicate pending invitations
CREATE OR REPLACE FUNCTION check_duplicate_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for existing pending invitation to same email for same target
  IF NEW.type = 'organization' THEN
    IF EXISTS (
      SELECT 1 FROM invitations
      WHERE organization_id = NEW.organization_id
        AND email = NEW.email
        AND accepted_at IS NULL
        AND declined_at IS NULL
        AND expires_at > NOW()
    ) THEN
      RAISE EXCEPTION 'A pending invitation already exists for this email';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM invitations
      WHERE project_id = NEW.project_id
        AND email = NEW.email
        AND accepted_at IS NULL
        AND declined_at IS NULL
        AND expires_at > NOW()
    ) THEN
      RAISE EXCEPTION 'A pending invitation already exists for this email';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_duplicate_invitation
  BEFORE INSERT ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_invitation();

-- Function to resend invitation (resets expiry)
CREATE OR REPLACE FUNCTION resend_invitation(p_invitation_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation and verify ownership
  SELECT * INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id
    AND (
      invited_by = auth.uid()
      OR (type = 'organization' AND get_org_role(organization_id) IN ('owner', 'admin'))
      OR (type = 'project' AND get_project_role(project_id) IN ('owner', 'admin'))
    )
    AND accepted_at IS NULL;

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already accepted';
  END IF;

  -- Reset expiry and clear declined status
  UPDATE invitations
  SET expires_at = NOW() + INTERVAL '7 days',
      declined_at = NULL
  WHERE id = p_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', p_invitation_id,
    'new_expires_at', NOW() + INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resend_invitation TO authenticated;
