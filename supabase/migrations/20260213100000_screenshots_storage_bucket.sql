-- Migration: Add brand-screenshots Storage bucket + screenshot path columns
-- Purpose: Store element screenshots in Supabase Storage instead of inline base64,
--          reducing JSONB bloat and improving load times.

-- ============================================================================
-- 1. STORAGE BUCKET for brand/style-guide screenshots
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-screenshots',
  'brand-screenshots',
  true,
  20971520,  -- 20MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- RLS policies for brand-screenshots storage (idempotent with DO $$ blocks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow authenticated users to upload brand-screenshots'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload brand-screenshots"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'brand-screenshots');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow authenticated users to update brand-screenshots'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to update brand-screenshots"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'brand-screenshots')
    WITH CHECK (bucket_id = 'brand-screenshots');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow public read access to brand-screenshots'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public read access to brand-screenshots"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'brand-screenshots');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow authenticated users to delete brand-screenshots'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete brand-screenshots"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'brand-screenshots');
  END IF;
END $$;

-- ============================================================================
-- 2. Add screenshot_storage_path to brand_design_dna
-- ============================================================================

ALTER TABLE public.brand_design_dna
ADD COLUMN IF NOT EXISTS screenshot_storage_path TEXT DEFAULT NULL;

COMMENT ON COLUMN public.brand_design_dna.screenshot_storage_path IS
  'Supabase Storage path for the brand screenshot (replaces inline base64)';

-- ============================================================================
-- 3. Add screenshot_storage_paths to style_guides
-- ============================================================================

ALTER TABLE public.style_guides
ADD COLUMN IF NOT EXISTS screenshot_storage_paths JSONB DEFAULT NULL;

COMMENT ON COLUMN public.style_guides.screenshot_storage_paths IS
  'Map of elementId → Storage path for element screenshots: { "el-1": "proj/style-guide-element/1234.jpg", ... }';
