-- Migration: Create can_use_feature function
-- Checks if the current user can use a specific feature in an organization

CREATE OR REPLACE FUNCTION can_use_feature(
  p_org_id UUID,
  p_feature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_module_id TEXT;
  v_has_subscription BOOLEAN;
  v_role_allowed BOOLEAN;
BEGIN
  -- Get user's role in the organization
  v_role := get_org_role(p_org_id);
  IF v_role IS NULL THEN
    -- User is not a member of this organization
    RETURN FALSE;
  END IF;

  -- Find which module contains this feature
  SELECT id INTO v_module_id
  FROM modules
  WHERE features ? p_feature
    AND is_active = TRUE
  LIMIT 1;

  IF v_module_id IS NULL THEN
    -- Feature not found in any module
    -- Could be a legacy feature or not module-gated
    -- Allow by default for backwards compatibility
    RETURN TRUE;
  END IF;

  -- Check if organization has an active subscription to the module
  SELECT EXISTS(
    SELECT 1 FROM organization_subscriptions
    WHERE organization_id = p_org_id
      AND module_id = v_module_id
      AND status = 'active'
  ) INTO v_has_subscription;

  IF NOT v_has_subscription THEN
    -- Organization doesn't have this module
    RETURN FALSE;
  END IF;

  -- Check if the user's role can use this module
  SELECT can_use INTO v_role_allowed
  FROM role_module_access
  WHERE role = v_role
    AND module_id = v_module_id;

  -- Default to false if no role access record found
  RETURN COALESCE(v_role_allowed, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add function comment
COMMENT ON FUNCTION can_use_feature(UUID, TEXT) IS
  'Checks if current user can use a feature in the specified organization. Returns true if: user is org member, org has active module subscription, and user role is allowed.';

-- Create a variant that uses the current user's active organization context
CREATE OR REPLACE FUNCTION can_use_feature(
  p_feature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get user's personal organization as default
  -- In a real app, this would come from session context
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  ORDER BY
    -- Prefer the organization where user is owner
    CASE WHEN role = 'owner' THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN can_use_feature(v_org_id, p_feature);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_use_feature(TEXT) IS
  'Checks if current user can use a feature using their default organization context.';

-- Create function to get all features available to user in an org
CREATE OR REPLACE FUNCTION get_available_features(
  p_org_id UUID
) RETURNS TEXT[] AS $$
DECLARE
  v_role TEXT;
  v_features TEXT[];
BEGIN
  -- Get user's role
  v_role := get_org_role(p_org_id);
  IF v_role IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Get all features from modules the org has access to AND the role can use
  SELECT ARRAY_AGG(DISTINCT feature)
  INTO v_features
  FROM (
    SELECT jsonb_array_elements_text(m.features) AS feature
    FROM modules m
    INNER JOIN organization_subscriptions os ON os.module_id = m.id
    INNER JOIN role_module_access rma ON rma.module_id = m.id AND rma.role = v_role
    WHERE os.organization_id = p_org_id
      AND os.status = 'active'
      AND m.is_active = TRUE
      AND rma.can_use = TRUE
  ) features;

  RETURN COALESCE(v_features, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_available_features(UUID) IS
  'Returns array of all feature flags available to the current user in the specified organization.';

-- Create function to check if org has a module subscription
CREATE OR REPLACE FUNCTION org_has_module(
  p_org_id UUID,
  p_module_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM organization_subscriptions
    WHERE organization_id = p_org_id
      AND module_id = p_module_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION org_has_module(UUID, TEXT) IS
  'Checks if an organization has an active subscription to a specific module.';
