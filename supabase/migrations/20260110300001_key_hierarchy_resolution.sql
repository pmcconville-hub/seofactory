-- supabase/migrations/20260110300001_key_hierarchy_resolution.sql
-- API key hierarchy resolution function (Phase 3)
-- Priority: Project BYOK > Organization BYOK > Organization Platform > User Settings (legacy)

-- Function to resolve API key for a given project and provider
-- Returns: encrypted_key UUID, key_source, billable_to, billable_id
CREATE OR REPLACE FUNCTION resolve_api_key(
  p_project_id UUID,
  p_provider TEXT
) RETURNS TABLE (
  encrypted_key UUID,
  key_source TEXT,
  billable_to TEXT,
  billable_id UUID
) AS $$
DECLARE
  v_org_id UUID;
  v_project_key RECORD;
  v_org_key RECORD;
BEGIN
  -- Get the organization for this project
  SELECT organization_id INTO v_org_id
  FROM projects
  WHERE id = p_project_id;

  -- 1. Check for project-level BYOK key
  SELECT pak.encrypted_key, pak.key_source
  INTO v_project_key
  FROM project_api_keys pak
  WHERE pak.project_id = p_project_id
    AND pak.provider = p_provider
    AND pak.is_active = TRUE
    AND pak.key_source = 'byok'
    AND pak.encrypted_key IS NOT NULL;

  IF FOUND THEN
    RETURN QUERY SELECT
      v_project_key.encrypted_key,
      'project_byok'::TEXT,
      'project'::TEXT,
      p_project_id;
    RETURN;
  END IF;

  -- 2. Check for organization-level key (BYOK first, then platform)
  IF v_org_id IS NOT NULL THEN
    -- Try BYOK first
    SELECT oak.encrypted_key, oak.key_source
    INTO v_org_key
    FROM organization_api_keys oak
    WHERE oak.organization_id = v_org_id
      AND oak.provider = p_provider
      AND oak.is_active = TRUE
      AND oak.key_source = 'byok';

    IF FOUND THEN
      RETURN QUERY SELECT
        v_org_key.encrypted_key::UUID,
        'org_byok'::TEXT,
        'organization'::TEXT,
        v_org_id;
      RETURN;
    END IF;

    -- Try platform key
    SELECT oak.encrypted_key, oak.key_source
    INTO v_org_key
    FROM organization_api_keys oak
    WHERE oak.organization_id = v_org_id
      AND oak.provider = p_provider
      AND oak.is_active = TRUE
      AND oak.key_source = 'platform';

    IF FOUND THEN
      RETURN QUERY SELECT
        v_org_key.encrypted_key::UUID,
        'platform'::TEXT,
        'platform'::TEXT,
        v_org_id;
      RETURN;
    END IF;
  END IF;

  -- 3. No key found
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if a project has a valid API key for a provider
CREATE OR REPLACE FUNCTION has_api_key(
  p_project_id UUID,
  p_provider TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM resolve_api_key(p_project_id, p_provider)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get billable entity for usage logging
CREATE OR REPLACE FUNCTION get_billable_info(
  p_project_id UUID,
  p_provider TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result
  FROM resolve_api_key(p_project_id, p_provider)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'key_source', v_result.key_source,
    'billable_to', v_result.billable_to,
    'billable_id', v_result.billable_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION resolve_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION has_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION get_billable_info TO authenticated;
