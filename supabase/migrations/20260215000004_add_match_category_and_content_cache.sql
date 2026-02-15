-- Add match_category to site_inventory for persisting auto-match results
-- and content_cached_at to track when content was last scraped/cached.

ALTER TABLE public.site_inventory
  ADD COLUMN IF NOT EXISTS match_category text
    CHECK (match_category IN ('matched', 'orphan', 'cannibalization'));

ALTER TABLE public.site_inventory
  ADD COLUMN IF NOT EXISTS content_cached_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_site_inventory_match_category
  ON public.site_inventory(match_category);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
