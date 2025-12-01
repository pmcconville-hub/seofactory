-- Foundation Pages & Navigation Structure Tables
-- Adds foundation pages (homepage, about, contact, privacy, terms) and navigation structure to topical maps

-- ===========================================
-- FOUNDATION PAGES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.foundation_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Page identification
  page_type TEXT NOT NULL CHECK (page_type IN ('homepage', 'about', 'contact', 'privacy', 'terms', 'author')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- SEO fields
  meta_description TEXT,
  h1_template TEXT,
  schema_type TEXT CHECK (schema_type IN ('Organization', 'AboutPage', 'ContactPage', 'WebPage')),

  -- Content structure
  sections JSONB, -- Array of {heading, purpose, required}

  -- NAP data (Name, Address, Phone) for E-A-T
  nap_data JSONB, -- {company_name, address, phone, email, founded_year}

  -- Soft delete support
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT CHECK (deletion_reason IN ('user_deleted', 'not_needed')),

  -- Additional metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each map can only have one of each page type
  UNIQUE(map_id, page_type)
);

-- Enable RLS
ALTER TABLE public.foundation_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own foundation pages"
  ON public.foundation_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own foundation pages"
  ON public.foundation_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foundation pages"
  ON public.foundation_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foundation pages"
  ON public.foundation_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_foundation_pages_map_id ON public.foundation_pages(map_id);
CREATE INDEX idx_foundation_pages_user_id ON public.foundation_pages(user_id);
CREATE INDEX idx_foundation_pages_type ON public.foundation_pages(page_type);

-- ===========================================
-- NAVIGATION STRUCTURES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.navigation_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Header configuration
  -- Structure: {logo_alt_text, primary_nav: [{id, text, target_topic_id, target_foundation_page_id, external_url, prominence, order}], cta_button: {text, target_topic_id, target_foundation_page_id, url}}
  header JSONB NOT NULL DEFAULT '{"logo_alt_text": "", "primary_nav": [], "cta_button": null}',

  -- Footer configuration
  -- Structure: {sections: [{id, heading, links: [...]}], legal_links: [...], nap_display: boolean, copyright_text: string}
  footer JSONB NOT NULL DEFAULT '{"sections": [], "legal_links": [], "nap_display": true, "copyright_text": ""}',

  -- Navigation limits (max 150 total links per page rule)
  max_header_links INTEGER DEFAULT 10,
  max_footer_links INTEGER DEFAULT 30,

  -- Dynamic navigation per section
  dynamic_by_section BOOLEAN DEFAULT true,

  -- Additional metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.navigation_structures ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own navigation"
  ON public.navigation_structures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own navigation"
  ON public.navigation_structures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own navigation"
  ON public.navigation_structures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own navigation"
  ON public.navigation_structures FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_navigation_structures_map_id ON public.navigation_structures(map_id);
CREATE INDEX idx_navigation_structures_user_id ON public.navigation_structures(user_id);

-- ===========================================
-- NAVIGATION SYNC STATUS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.navigation_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE UNIQUE,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  topics_modified_since INTEGER DEFAULT 0,
  requires_review BOOLEAN DEFAULT false,

  -- Pending changes
  -- Structure: {addedTopics: [string], deletedTopics: [string], renamedTopics: [{id, oldTitle, newTitle}]}
  pending_changes JSONB DEFAULT '{"addedTopics": [], "deletedTopics": [], "renamedTopics": []}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.navigation_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies (via topical_maps ownership)
CREATE POLICY "Users can view own sync status"
  ON public.navigation_sync_status FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.topical_maps
    WHERE id = navigation_sync_status.map_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create own sync status"
  ON public.navigation_sync_status FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.topical_maps
    WHERE id = navigation_sync_status.map_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update own sync status"
  ON public.navigation_sync_status FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.topical_maps
    WHERE id = navigation_sync_status.map_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own sync status"
  ON public.navigation_sync_status FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.topical_maps
    WHERE id = navigation_sync_status.map_id AND user_id = auth.uid()
  ));

-- Index
CREATE INDEX idx_navigation_sync_status_map_id ON public.navigation_sync_status(map_id);

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Function to update foundation_pages updated_at timestamp
CREATE OR REPLACE FUNCTION update_foundation_pages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_foundation_pages_updated_at
  BEFORE UPDATE ON public.foundation_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_foundation_pages_timestamp();

-- Function to update navigation_structures updated_at timestamp
CREATE OR REPLACE FUNCTION update_navigation_structures_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_navigation_structures_updated_at
  BEFORE UPDATE ON public.navigation_structures
  FOR EACH ROW
  EXECUTE FUNCTION update_navigation_structures_timestamp();

-- Function to update navigation_sync_status updated_at timestamp
CREATE OR REPLACE FUNCTION update_navigation_sync_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_navigation_sync_status_updated_at
  BEFORE UPDATE ON public.navigation_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_navigation_sync_status_timestamp();

-- ===========================================
-- CRUD FUNCTIONS
-- ===========================================

-- Function to create foundation pages for a map
CREATE OR REPLACE FUNCTION create_foundation_pages(
  p_map_id UUID,
  p_pages JSONB
)
RETURNS SETOF public.foundation_pages AS $$
DECLARE
  v_user_id UUID;
  v_page JSONB;
BEGIN
  -- Get user_id from topical_maps
  SELECT user_id INTO v_user_id FROM public.topical_maps WHERE id = p_map_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Map not found: %', p_map_id;
  END IF;

  -- Insert each page
  FOR v_page IN SELECT * FROM jsonb_array_elements(p_pages)
  LOOP
    RETURN QUERY
    INSERT INTO public.foundation_pages (
      map_id,
      user_id,
      page_type,
      title,
      slug,
      meta_description,
      h1_template,
      schema_type,
      sections,
      nap_data,
      metadata
    ) VALUES (
      p_map_id,
      v_user_id,
      v_page->>'page_type',
      v_page->>'title',
      v_page->>'slug',
      v_page->>'meta_description',
      v_page->>'h1_template',
      v_page->>'schema_type',
      v_page->'sections',
      v_page->'nap_data',
      v_page->'metadata'
    )
    ON CONFLICT (map_id, page_type) DO UPDATE SET
      title = EXCLUDED.title,
      slug = EXCLUDED.slug,
      meta_description = EXCLUDED.meta_description,
      h1_template = EXCLUDED.h1_template,
      schema_type = EXCLUDED.schema_type,
      sections = EXCLUDED.sections,
      nap_data = EXCLUDED.nap_data,
      metadata = EXCLUDED.metadata,
      deleted_at = NULL,
      deletion_reason = NULL,
      updated_at = NOW()
    RETURNING *;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or update navigation structure
CREATE OR REPLACE FUNCTION upsert_navigation_structure(
  p_map_id UUID,
  p_header JSONB,
  p_footer JSONB,
  p_max_header_links INTEGER DEFAULT 10,
  p_max_footer_links INTEGER DEFAULT 30,
  p_dynamic_by_section BOOLEAN DEFAULT true,
  p_metadata JSONB DEFAULT NULL
)
RETURNS public.navigation_structures AS $$
DECLARE
  v_user_id UUID;
  v_result public.navigation_structures;
BEGIN
  -- Get user_id from topical_maps
  SELECT user_id INTO v_user_id FROM public.topical_maps WHERE id = p_map_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Map not found: %', p_map_id;
  END IF;

  INSERT INTO public.navigation_structures (
    map_id,
    user_id,
    header,
    footer,
    max_header_links,
    max_footer_links,
    dynamic_by_section,
    metadata
  ) VALUES (
    p_map_id,
    v_user_id,
    p_header,
    p_footer,
    p_max_header_links,
    p_max_footer_links,
    p_dynamic_by_section,
    p_metadata
  )
  ON CONFLICT (map_id) DO UPDATE SET
    header = EXCLUDED.header,
    footer = EXCLUDED.footer,
    max_header_links = EXCLUDED.max_header_links,
    max_footer_links = EXCLUDED.max_footer_links,
    dynamic_by_section = EXCLUDED.dynamic_by_section,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete a foundation page
CREATE OR REPLACE FUNCTION soft_delete_foundation_page(
  p_page_id UUID,
  p_reason TEXT DEFAULT 'user_deleted'
)
RETURNS public.foundation_pages AS $$
DECLARE
  v_result public.foundation_pages;
BEGIN
  UPDATE public.foundation_pages
  SET
    deleted_at = NOW(),
    deletion_reason = p_reason
  WHERE id = p_page_id AND auth.uid() = user_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted foundation page
CREATE OR REPLACE FUNCTION restore_foundation_page(p_page_id UUID)
RETURNS public.foundation_pages AS $$
DECLARE
  v_result public.foundation_pages;
BEGIN
  UPDATE public.foundation_pages
  SET
    deleted_at = NULL,
    deletion_reason = NULL
  WHERE id = p_page_id AND auth.uid() = user_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track topic changes for navigation sync
CREATE OR REPLACE FUNCTION track_topic_change_for_nav_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_map_id UUID;
  v_pending JSONB;
BEGIN
  -- Determine the map_id
  IF TG_OP = 'DELETE' THEN
    v_map_id := OLD.map_id;
  ELSE
    v_map_id := NEW.map_id;
  END IF;

  -- Get or create sync status
  INSERT INTO public.navigation_sync_status (map_id)
  VALUES (v_map_id)
  ON CONFLICT (map_id) DO NOTHING;

  -- Update sync status based on operation
  IF TG_OP = 'INSERT' THEN
    UPDATE public.navigation_sync_status
    SET
      topics_modified_since = topics_modified_since + 1,
      requires_review = true,
      pending_changes = jsonb_set(
        pending_changes,
        '{addedTopics}',
        COALESCE(pending_changes->'addedTopics', '[]'::jsonb) || to_jsonb(NEW.title)
      )
    WHERE map_id = v_map_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.navigation_sync_status
    SET
      topics_modified_since = topics_modified_since + 1,
      requires_review = true,
      pending_changes = jsonb_set(
        pending_changes,
        '{deletedTopics}',
        COALESCE(pending_changes->'deletedTopics', '[]'::jsonb) || to_jsonb(OLD.title)
      )
    WHERE map_id = v_map_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.title != NEW.title THEN
    UPDATE public.navigation_sync_status
    SET
      topics_modified_since = topics_modified_since + 1,
      requires_review = true,
      pending_changes = jsonb_set(
        pending_changes,
        '{renamedTopics}',
        COALESCE(pending_changes->'renamedTopics', '[]'::jsonb) || jsonb_build_object('id', NEW.id, 'oldTitle', OLD.title, 'newTitle', NEW.title)
      )
    WHERE map_id = v_map_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track topic changes
CREATE TRIGGER track_topic_changes_for_nav
  AFTER INSERT OR UPDATE OR DELETE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION track_topic_change_for_nav_sync();

-- Function to mark navigation as synced
CREATE OR REPLACE FUNCTION mark_navigation_synced(p_map_id UUID)
RETURNS public.navigation_sync_status AS $$
DECLARE
  v_result public.navigation_sync_status;
BEGIN
  UPDATE public.navigation_sync_status
  SET
    last_synced_at = NOW(),
    topics_modified_since = 0,
    requires_review = false,
    pending_changes = '{"addedTopics": [], "deletedTopics": [], "renamedTopics": []}'::jsonb
  WHERE map_id = p_map_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
