-- Fix brand_components RLS policies (force re-apply)
-- The previous migration was recorded as applied but policies weren't created

-- Drop all existing policies on brand_components
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_select" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_insert" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_update" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_delete" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage own brand_components" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Ensure RLS is enabled
ALTER TABLE brand_components ENABLE ROW LEVEL SECURITY;

-- Create proper policies with has_project_access function
CREATE POLICY "brand_components_select" ON brand_components
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_components_insert" ON brand_components
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_components_update" ON brand_components
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_components_delete" ON brand_components
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- Also fix brand_tokens (was also getting 403s)
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_select" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_insert" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_update" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_delete" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage own brand_tokens" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE brand_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_tokens_select" ON brand_tokens
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_tokens_insert" ON brand_tokens
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_tokens_update" ON brand_tokens
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_tokens_delete" ON brand_tokens
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));
