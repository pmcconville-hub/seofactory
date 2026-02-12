-- Migration: Add styleguide storage bucket and topical_maps.styleguide_data column
-- Purpose: Store brand styleguide HTML files and design tokens for the styleguide generator

-- ============================================================================
-- 1. STORAGE BUCKET for styleguide HTML files
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'styleguides',
  'styleguides',
  true,
  5242880,  -- 5MB (styleguides are 200-400KB HTML)
  ARRAY['text/html']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['text/html'];

-- RLS policies for styleguide storage
CREATE POLICY "Allow authenticated users to upload styleguides"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'styleguides');

CREATE POLICY "Allow authenticated users to update styleguides"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'styleguides')
WITH CHECK (bucket_id = 'styleguides');

CREATE POLICY "Allow public read access to styleguides"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'styleguides');

CREATE POLICY "Allow authenticated users to delete styleguides"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'styleguides');

-- ============================================================================
-- 2. JSONB COLUMN on topical_maps for design tokens
-- ============================================================================

ALTER TABLE public.topical_maps
ADD COLUMN IF NOT EXISTS styleguide_data JSONB DEFAULT NULL;

-- Add a comment describing the column structure
COMMENT ON COLUMN public.topical_maps.styleguide_data IS
  'BrandStyleguideData: { designTokens, brandAnalysis, htmlStorageKey, generatedAt, version }';
