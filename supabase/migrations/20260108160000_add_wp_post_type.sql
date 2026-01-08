-- Add post_type column to wordpress_publications
-- Allows distinguishing between WordPress posts and pages

ALTER TABLE wordpress_publications
ADD COLUMN IF NOT EXISTS wp_post_type TEXT DEFAULT 'page' CHECK (wp_post_type IN ('post', 'page'));

-- Update existing records to default to 'page' (most topical map items are pages)
UPDATE wordpress_publications SET wp_post_type = 'page' WHERE wp_post_type IS NULL;

COMMENT ON COLUMN wordpress_publications.wp_post_type IS 'WordPress content type: post or page';
