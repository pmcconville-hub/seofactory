-- Fix WordPress Connections RLS Policies
-- The multi-tenancy update removed user-based policies, breaking connection creation
-- This migration restores user-based access while maintaining org-based access

-- ============================================================================
-- 1. Drop existing restrictive policies
-- ============================================================================
DROP POLICY IF EXISTS "Org members can view wp connections" ON wordpress_connections;
DROP POLICY IF EXISTS "Admins can manage wp connections" ON wordpress_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON wordpress_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON wordpress_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON wordpress_connections;

-- ============================================================================
-- 2. Create new comprehensive policies
-- ============================================================================

-- SELECT: Users can view connections they own OR through org membership
CREATE POLICY "Users can view connections"
  ON wordpress_connections FOR SELECT
  TO authenticated
  USING (
    -- User owns the connection
    user_id = auth.uid()
    OR
    -- User is member of the connection's organization
    (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
      )
    )
    OR
    -- User has access to the connection's project
    (
      project_id IS NOT NULL
      AND has_project_access(project_id)
    )
  );

-- INSERT: Users can insert their own connections
CREATE POLICY "Users can insert own connections"
  ON wordpress_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be inserting as themselves
    user_id = auth.uid()
    AND
    -- If project_id specified, must have access
    (project_id IS NULL OR has_project_access(project_id))
  );

-- UPDATE: Users can update their own connections OR if they're org admin
CREATE POLICY "Users can update connections"
  ON wordpress_connections FOR UPDATE
  TO authenticated
  USING (
    -- User owns the connection
    user_id = auth.uid()
    OR
    -- User is admin of the connection's organization
    (
      organization_id IS NOT NULL
      AND get_org_role(organization_id) IN ('owner', 'admin')
    )
  );

-- DELETE: Users can delete their own connections OR if they're org admin
CREATE POLICY "Users can delete connections"
  ON wordpress_connections FOR DELETE
  TO authenticated
  USING (
    -- User owns the connection
    user_id = auth.uid()
    OR
    -- User is admin of the connection's organization
    (
      organization_id IS NOT NULL
      AND get_org_role(organization_id) IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. Add comment
-- ============================================================================
COMMENT ON POLICY "Users can view connections" ON wordpress_connections IS
  'Users can view their own connections, org member connections, or project connections';
COMMENT ON POLICY "Users can insert own connections" ON wordpress_connections IS
  'Users can create their own WordPress connections';
COMMENT ON POLICY "Users can update connections" ON wordpress_connections IS
  'Users can update their own connections or org connections if admin';
COMMENT ON POLICY "Users can delete connections" ON wordpress_connections IS
  'Users can delete their own connections or org connections if admin';
