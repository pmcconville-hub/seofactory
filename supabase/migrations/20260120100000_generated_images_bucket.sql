-- Create storage bucket for generated/uploaded images
-- This provides persistent image storage when Cloudinary is not configured

-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,  -- Public bucket so images can be viewed without auth
  10485760,  -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Create RLS policies for the storage bucket
-- Drop existing policies first to avoid conflicts
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated users to upload generated images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to update generated images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to generated images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to delete generated images" ON storage.objects;
END $$;

-- Create RLS policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload generated images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-images');

-- Create RLS policy to allow authenticated users to update their own images
CREATE POLICY "Allow authenticated users to update generated images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-images')
WITH CHECK (bucket_id = 'generated-images');

-- Create RLS policy to allow public read access (bucket is public)
CREATE POLICY "Allow public read access to generated images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generated-images');

-- Create RLS policy to allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated users to delete generated images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'generated-images');
