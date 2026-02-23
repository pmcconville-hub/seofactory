-- ============================================================================
-- FIX: Update product catalog RLS to use organization-based access
-- ============================================================================
-- The original RLS policies on product_catalogs, catalog_categories,
-- catalog_products, and product_category_assignments use the legacy
-- auth.uid() = user_id pattern, which blocks access for org members.
--
-- This migration updates all 4 tables to use has_project_access() via the
-- topical_maps → projects chain, matching the pattern used for topics,
-- content_briefs, etc. in 20260110170000_fix_org_rls_policies.sql.
-- ============================================================================

-- ============================================================================
-- PRODUCT CATALOGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own catalogs" ON product_catalogs;
DROP POLICY IF EXISTS "Users can view accessible catalogs" ON product_catalogs;
CREATE POLICY "Users can view accessible catalogs"
  ON product_catalogs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = product_catalogs.map_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR public.is_super_admin()
        )
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can insert own catalogs" ON product_catalogs;
DROP POLICY IF EXISTS "Users can insert accessible catalogs" ON product_catalogs;
CREATE POLICY "Users can insert accessible catalogs"
  ON product_catalogs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = product_catalogs.map_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own catalogs" ON product_catalogs;
DROP POLICY IF EXISTS "Users can update accessible catalogs" ON product_catalogs;
CREATE POLICY "Users can update accessible catalogs"
  ON product_catalogs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = product_catalogs.map_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can delete own catalogs" ON product_catalogs;
DROP POLICY IF EXISTS "Users can delete accessible catalogs" ON product_catalogs;
CREATE POLICY "Users can delete accessible catalogs"
  ON product_catalogs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topical_maps tm
      JOIN projects p ON p.id = tm.project_id
      WHERE tm.id = product_catalogs.map_id
        AND (
          get_project_role(p.id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
        )
    )
    OR user_id = auth.uid()
  );

-- ============================================================================
-- CATALOG CATEGORIES POLICIES
-- Chain: catalog_categories → product_catalogs → topical_maps → projects
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own categories" ON catalog_categories;
DROP POLICY IF EXISTS "Users can view accessible categories" ON catalog_categories;
CREATE POLICY "Users can view accessible categories"
  ON catalog_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_catalogs pc
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE pc.id = catalog_categories.catalog_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR public.is_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert own categories" ON catalog_categories;
DROP POLICY IF EXISTS "Users can insert accessible categories" ON catalog_categories;
CREATE POLICY "Users can insert accessible categories"
  ON catalog_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_catalogs pc
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE pc.id = catalog_categories.catalog_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can update own categories" ON catalog_categories;
DROP POLICY IF EXISTS "Users can update accessible categories" ON catalog_categories;
CREATE POLICY "Users can update accessible categories"
  ON catalog_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_catalogs pc
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE pc.id = catalog_categories.catalog_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete own categories" ON catalog_categories;
DROP POLICY IF EXISTS "Users can delete accessible categories" ON catalog_categories;
CREATE POLICY "Users can delete accessible categories"
  ON catalog_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_catalogs pc
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE pc.id = catalog_categories.catalog_id
        AND (
          get_project_role(p.id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- CATALOG PRODUCTS POLICIES
-- Chain: catalog_products → product_catalogs → topical_maps → projects
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own products" ON catalog_products;
DROP POLICY IF EXISTS "Users can view accessible products" ON catalog_products;
CREATE POLICY "Users can view accessible products"
  ON catalog_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_catalogs pc
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE pc.id = catalog_products.catalog_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR public.is_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert own products" ON catalog_products;
DROP POLICY IF EXISTS "Users can insert accessible products" ON catalog_products;
CREATE POLICY "Users can insert accessible products"
  ON catalog_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_catalogs pc
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE pc.id = catalog_products.catalog_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can update own products" ON catalog_products;
DROP POLICY IF EXISTS "Users can update accessible products" ON catalog_products;
CREATE POLICY "Users can update accessible products"
  ON catalog_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_catalogs pc
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE pc.id = catalog_products.catalog_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete own products" ON catalog_products;
DROP POLICY IF EXISTS "Users can delete accessible products" ON catalog_products;
CREATE POLICY "Users can delete accessible products"
  ON catalog_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_catalogs pc
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE pc.id = catalog_products.catalog_id
        AND (
          get_project_role(p.id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- PRODUCT CATEGORY ASSIGNMENTS POLICIES
-- Chain: assignments → catalog_products → product_catalogs → topical_maps → projects
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own assignments" ON product_category_assignments;
DROP POLICY IF EXISTS "Users can view accessible assignments" ON product_category_assignments;
CREATE POLICY "Users can view accessible assignments"
  ON product_category_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_products cp
      JOIN product_catalogs pc ON pc.id = cp.catalog_id
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cp.id = product_category_assignments.product_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR public.is_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert own assignments" ON product_category_assignments;
DROP POLICY IF EXISTS "Users can insert accessible assignments" ON product_category_assignments;
CREATE POLICY "Users can insert accessible assignments"
  ON product_category_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM catalog_products cp
      JOIN product_catalogs pc ON pc.id = cp.catalog_id
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cp.id = product_category_assignments.product_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can update own assignments" ON product_category_assignments;
DROP POLICY IF EXISTS "Users can update accessible assignments" ON product_category_assignments;
CREATE POLICY "Users can update accessible assignments"
  ON product_category_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_products cp
      JOIN product_catalogs pc ON pc.id = cp.catalog_id
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cp.id = product_category_assignments.product_id
        AND (
          has_project_access(p.id)
          OR tm.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete own assignments" ON product_category_assignments;
DROP POLICY IF EXISTS "Users can delete accessible assignments" ON product_category_assignments;
CREATE POLICY "Users can delete accessible assignments"
  ON product_category_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM catalog_products cp
      JOIN product_catalogs pc ON pc.id = cp.catalog_id
      JOIN topical_maps tm ON tm.id = pc.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE cp.id = product_category_assignments.product_id
        AND (
          get_project_role(p.id) IN ('owner', 'admin')
          OR tm.user_id = auth.uid()
        )
    )
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
