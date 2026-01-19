-- Social Media Publishing System Migration
-- Created: 2026-01-20
-- Purpose: Add tables for social media content transformation, campaigns, and export tracking

-- ============================================================================
-- SOCIAL CAMPAIGNS TABLE (Hub-Spoke groupings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    job_id UUID REFERENCES content_generation_jobs(id) ON DELETE SET NULL,

    -- Campaign info
    campaign_name TEXT,
    hub_platform TEXT,  -- Primary platform for hub post (linkedin, twitter, facebook, instagram, pinterest)

    -- UTM configuration
    utm_source TEXT,
    utm_medium TEXT DEFAULT 'organic-social',
    utm_campaign TEXT,

    -- Campaign status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'exported', 'partially_posted', 'completed')),

    -- Semantic compliance
    overall_compliance_score NUMERIC(5,2),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_social_campaigns_user ON social_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_topic ON social_campaigns(topic_id);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_status ON social_campaigns(status);

-- ============================================================================
-- SOCIAL POSTS TABLE (Individual platform posts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES social_campaigns(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    job_id UUID REFERENCES content_generation_jobs(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Hub-spoke relationship
    is_hub BOOLEAN DEFAULT false,
    spoke_position INT,  -- 1-7 for supporting posts

    -- Platform & type
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'pinterest')),
    post_type TEXT NOT NULL CHECK (post_type IN ('single', 'thread', 'carousel', 'story', 'pin')),

    -- Content
    content_text TEXT NOT NULL,
    content_thread JSONB,  -- For threads: [{index, text}]
    hashtags TEXT[],
    mentions TEXT[],

    -- Media instructions
    image_instructions JSONB,  -- {description, alt_text, dimensions, source_placeholder_id}

    -- Link & tracking
    link_url TEXT,
    utm_parameters JSONB,
    short_link TEXT,  -- Optional shortened URL

    -- Posting instructions (shown to user)
    posting_instructions TEXT,
    optimal_posting_time TEXT,  -- e.g., "Tuesday 10am-12pm"

    -- Manual tracking
    manually_posted_at TIMESTAMPTZ,
    platform_post_url TEXT,  -- User enters after posting

    -- Semantic compliance
    semantic_compliance_score NUMERIC(5,2),
    eav_triple JSONB,  -- {entity, attribute, value, category}
    entities_mentioned TEXT[],
    semantic_distance_from_hub NUMERIC(4,3),

    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'exported', 'posted')),
    exported_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_social_posts_campaign ON social_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_topic ON social_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);

-- ============================================================================
-- SOCIAL POST TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_post_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE,

    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'pinterest')),
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN (
        'key_takeaway', 'entity_spotlight', 'question_hook', 'stat_highlight',
        'tip_series', 'quote_card', 'listicle', 'hub_announcement', 'spoke_teaser'
    )),

    -- Content patterns (with placeholders)
    content_pattern TEXT NOT NULL,
    -- Placeholders: {{title}}, {{entity}}, {{attribute}}, {{value}}, {{key_takeaway}}, {{hook}}, {{cta}}, {{hashtags}}, {{link}}

    -- Platform-specific settings
    hashtag_strategy JSONB,  -- {count, placement, branded, niche}
    cta_templates TEXT[],
    character_limits JSONB,  -- {main, thread_segment, preview}
    image_specs JSONB,  -- {aspect_ratio, min_width, max_file_size_mb}

    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_social_templates_user ON social_post_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_social_templates_platform ON social_post_templates(platform);
CREATE INDEX IF NOT EXISTS idx_social_templates_type ON social_post_templates(template_type);

-- ============================================================================
-- ENTITY-TO-HASHTAG MAPPINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_hashtag_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    entity_name TEXT NOT NULL,
    entity_type TEXT,  -- Person, Organization, Product, etc.
    wikidata_id TEXT,

    -- Platform-specific hashtags
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'pinterest')),
    primary_hashtag TEXT NOT NULL,
    secondary_hashtags TEXT[],
    branded_hashtags TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint per map/entity/platform
    CONSTRAINT entity_hashtag_unique UNIQUE (map_id, entity_name, platform)
);

-- Indexes for hashtag mappings
CREATE INDEX IF NOT EXISTS idx_entity_hashtags_map ON entity_hashtag_mappings(map_id);
CREATE INDEX IF NOT EXISTS idx_entity_hashtags_entity ON entity_hashtag_mappings(entity_name);
CREATE INDEX IF NOT EXISTS idx_entity_hashtags_platform ON entity_hashtag_mappings(platform);

-- ============================================================================
-- PLATFORM POSTING GUIDES TABLE (Admin-managed reference data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_posting_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL UNIQUE CHECK (platform IN ('linkedin', 'twitter', 'facebook', 'instagram', 'pinterest')),

    -- Specifications
    character_limits JSONB NOT NULL,  -- {main: 280, thread_segment: 280, preview: 280}
    image_specs JSONB NOT NULL,  -- {aspect_ratio: "16:9", min_width: 1200, max_file_size_mb: 5}
    hashtag_guidelines JSONB NOT NULL,  -- {optimal_count: 3, placement: "end", strategy: "niche+branded"}

    -- Instructions
    posting_instructions TEXT NOT NULL,  -- Step-by-step guide
    best_practices TEXT,
    optimal_times JSONB,  -- {days: ["Tuesday", "Wednesday", "Thursday"], hours: ["10am-12pm", "2pm-4pm"]}

    -- Links
    help_url TEXT,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SOCIAL EXPORT HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES social_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    export_type TEXT CHECK (export_type IN ('single_post', 'full_campaign', 'bulk_package')),
    export_format TEXT CHECK (export_format IN ('clipboard', 'json', 'txt', 'zip')),
    posts_included UUID[],

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for export history
CREATE INDEX IF NOT EXISTS idx_social_export_campaign ON social_export_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_export_user ON social_export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_social_export_created ON social_export_history(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_hashtag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_posting_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_export_history ENABLE ROW LEVEL SECURITY;

-- Social Campaigns policies
DROP POLICY IF EXISTS "Users can view own campaigns" ON social_campaigns;
CREATE POLICY "Users can view own campaigns"
ON social_campaigns FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaigns" ON social_campaigns;
CREATE POLICY "Users can insert own campaigns"
ON social_campaigns FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON social_campaigns;
CREATE POLICY "Users can update own campaigns"
ON social_campaigns FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON social_campaigns;
CREATE POLICY "Users can delete own campaigns"
ON social_campaigns FOR DELETE
USING (auth.uid() = user_id);

-- Social Posts policies
DROP POLICY IF EXISTS "Users can view own posts" ON social_posts;
CREATE POLICY "Users can view own posts"
ON social_posts FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own posts" ON social_posts;
CREATE POLICY "Users can insert own posts"
ON social_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON social_posts;
CREATE POLICY "Users can update own posts"
ON social_posts FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON social_posts;
CREATE POLICY "Users can delete own posts"
ON social_posts FOR DELETE
USING (auth.uid() = user_id);

-- Social Post Templates policies
DROP POLICY IF EXISTS "Users can view own templates" ON social_post_templates;
CREATE POLICY "Users can view own templates"
ON social_post_templates FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);  -- NULL user_id = default templates

DROP POLICY IF EXISTS "Users can insert own templates" ON social_post_templates;
CREATE POLICY "Users can insert own templates"
ON social_post_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON social_post_templates;
CREATE POLICY "Users can update own templates"
ON social_post_templates FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON social_post_templates;
CREATE POLICY "Users can delete own templates"
ON social_post_templates FOR DELETE
USING (auth.uid() = user_id);

-- Entity Hashtag Mappings policies
DROP POLICY IF EXISTS "Users can view own hashtag mappings" ON entity_hashtag_mappings;
CREATE POLICY "Users can view own hashtag mappings"
ON entity_hashtag_mappings FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own hashtag mappings" ON entity_hashtag_mappings;
CREATE POLICY "Users can insert own hashtag mappings"
ON entity_hashtag_mappings FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own hashtag mappings" ON entity_hashtag_mappings;
CREATE POLICY "Users can update own hashtag mappings"
ON entity_hashtag_mappings FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own hashtag mappings" ON entity_hashtag_mappings;
CREATE POLICY "Users can delete own hashtag mappings"
ON entity_hashtag_mappings FOR DELETE
USING (auth.uid() = user_id);

-- Platform Posting Guides policies (read-only for all authenticated users)
DROP POLICY IF EXISTS "All users can view platform guides" ON platform_posting_guides;
CREATE POLICY "All users can view platform guides"
ON platform_posting_guides FOR SELECT
USING (true);

-- Social Export History policies
DROP POLICY IF EXISTS "Users can view own export history" ON social_export_history;
CREATE POLICY "Users can view own export history"
ON social_export_history FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own export history" ON social_export_history;
CREATE POLICY "Users can insert own export history"
ON social_export_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SEED DEFAULT PLATFORM POSTING GUIDES
-- ============================================================================

INSERT INTO platform_posting_guides (platform, character_limits, image_specs, hashtag_guidelines, posting_instructions, best_practices, optimal_times, help_url)
VALUES
(
    'linkedin',
    '{"main": 3000, "preview": 210, "article": 125000}',
    '{"landscape": {"width": 1200, "height": 627}, "square": {"width": 1080, "height": 1080}, "max_file_size_mb": 5, "formats": ["jpg", "png"]}',
    '{"optimal_count": 5, "max_count": 5, "placement": "end", "strategy": "Mix of industry and branded hashtags"}',
    E'## LinkedIn Posting Instructions\n\n### Steps to Post\n1. Go to linkedin.com and click "Start a post"\n2. Paste the content above\n3. Click the image icon and upload your image\n4. Review hashtags are at the end of the post\n5. Click "Post"\n\n### Image Requirements\n- Landscape: 1200x627 pixels\n- Square: 1080x1080 pixels\n- Format: JPG or PNG, max 5MB',
    E'- Posts under 300 characters get 12% higher engagement\n- Engage with comments within the first hour\n- Use line breaks for readability\n- Tag relevant people and companies',
    '{"days": ["Tuesday", "Wednesday", "Thursday"], "hours": ["10am-12pm", "2pm-4pm"]}',
    'https://www.linkedin.com/help/linkedin/answer/46545'
),
(
    'twitter',
    '{"main": 280, "thread_segment": 280, "premium": 25000}',
    '{"card": {"width": 1200, "height": 628}, "square": {"width": 1080, "height": 1080}, "max_file_size_mb": 5, "formats": ["jpg", "png", "gif"]}',
    '{"optimal_count": 2, "max_count": 2, "placement": "integrated", "strategy": "1-2 highly relevant hashtags only"}',
    E'## X/Twitter Posting Instructions\n\n### Steps to Post\n1. Go to x.com and click the compose button\n2. Paste the content\n3. For threads: click the "+" to add more tweets\n4. Attach image if applicable\n5. Click "Post" or "Post all" for threads\n\n### Image Requirements\n- Card image: 1200x628 pixels\n- Format: JPG, PNG, or GIF, max 5MB',
    E'- Threads get 3x more engagement than single tweets\n- First tweet should hook attention in first 5 words\n- Post during peak hours for your audience\n- Engage with replies quickly',
    '{"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "hours": ["8am-10am", "12pm-1pm"]}',
    'https://help.twitter.com/en/using-x'
),
(
    'facebook',
    '{"main": 63206, "optimal": 80, "link_preview": 500}',
    '{"link": {"width": 1200, "height": 628}, "square": {"width": 1080, "height": 1080}, "max_file_size_mb": 4, "formats": ["jpg", "png"]}',
    '{"optimal_count": 3, "max_count": 3, "placement": "end", "strategy": "Broad and relevant hashtags"}',
    E'## Facebook Posting Instructions\n\n### Steps to Post\n1. Go to your Facebook Page\n2. Click "Create post"\n3. Paste the content\n4. Add your image or let the link preview generate\n5. Click "Post"\n\n### Image Requirements\n- Link preview: 1200x628 pixels\n- Format: JPG or PNG, max 4MB',
    E'- Posts with images get 2.3x more engagement\n- Keep text under 80 characters for best engagement\n- Respond to comments to boost reach\n- Use Facebook native video when possible',
    '{"days": ["Wednesday", "Thursday", "Friday"], "hours": ["1pm-4pm"]}',
    'https://www.facebook.com/help/1674658279433330'
),
(
    'instagram',
    '{"main": 2200, "preview": 125, "bio": 150}',
    '{"portrait": {"width": 1080, "height": 1350}, "square": {"width": 1080, "height": 1080}, "story": {"width": 1080, "height": 1920}, "max_file_size_mb": 8, "formats": ["jpg", "png"]}',
    '{"optimal_count": 5, "max_count": 30, "placement": "caption_or_comment", "strategy": "Mix of popular, niche, and branded hashtags"}',
    E'## Instagram Posting Instructions\n\n### Steps to Post\n1. Open Instagram app (mobile recommended)\n2. Tap the + icon to create a post\n3. Select your image(s) for single or carousel\n4. Add your caption\n5. Add hashtags at the end or in first comment\n6. Tap "Share"\n\n### Image Requirements\n- Portrait (recommended): 1080x1350 pixels (4:5)\n- Square: 1080x1080 pixels\n- Format: JPG or PNG, max 8MB',
    E'- First 125 characters appear before "more"\n- Use 3-5 relevant hashtags for best reach\n- Post carousels for higher engagement\n- Stories disappear after 24 hours',
    '{"days": ["Monday", "Wednesday", "Friday"], "hours": ["11am-1pm", "7pm-9pm"]}',
    'https://help.instagram.com/'
),
(
    'pinterest',
    '{"main": 500, "title": 100}',
    '{"pin": {"width": 1000, "height": 1500}, "ratio": "2:3", "max_file_size_mb": 32, "formats": ["jpg", "png"]}',
    '{"optimal_count": 0, "max_count": 0, "placement": "none", "strategy": "Use keywords in title and description instead of hashtags"}',
    E'## Pinterest Pin Instructions\n\n### Steps to Create a Pin\n1. Go to pinterest.com and click "+"\n2. Select "Create Pin"\n3. Upload your vertical image\n4. Add a keyword-rich title (max 100 chars)\n5. Write a description with relevant keywords\n6. Add destination link\n7. Select relevant board\n8. Click "Publish"\n\n### Image Requirements\n- Vertical 2:3 ratio: 1000x1500 pixels\n- Format: JPG or PNG, max 32MB',
    E'- Pinterest is a search engine - use keywords, not hashtags\n- Vertical images perform best (2:3 ratio)\n- Include clear, readable text on images\n- Pin consistently over time',
    '{"days": ["Saturday", "Sunday"], "hours": ["8pm-11pm"]}',
    'https://help.pinterest.com/en/business'
)
ON CONFLICT (platform) DO NOTHING;

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_social_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS social_campaigns_updated_at ON social_campaigns;
CREATE TRIGGER social_campaigns_updated_at
    BEFORE UPDATE ON social_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_social_updated_at();

DROP TRIGGER IF EXISTS social_posts_updated_at ON social_posts;
CREATE TRIGGER social_posts_updated_at
    BEFORE UPDATE ON social_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_social_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE social_campaigns IS 'Social media campaigns using hub-spoke model for coordinated posting';
COMMENT ON TABLE social_posts IS 'Individual social media posts for each platform';
COMMENT ON TABLE social_post_templates IS 'Reusable templates for generating social posts';
COMMENT ON TABLE entity_hashtag_mappings IS 'Maps entities from content to platform-specific hashtags';
COMMENT ON TABLE platform_posting_guides IS 'Reference data for platform specifications and posting instructions';
COMMENT ON TABLE social_export_history IS 'Tracks export actions for analytics';

COMMENT ON COLUMN social_campaigns.hub_platform IS 'Primary platform where the hub post is published';
COMMENT ON COLUMN social_posts.is_hub IS 'True for the main hub post, false for spoke posts';
COMMENT ON COLUMN social_posts.spoke_position IS 'Position in the spoke sequence (1-7)';
COMMENT ON COLUMN social_posts.eav_triple IS 'The Entity-Attribute-Value triple this post communicates';
COMMENT ON COLUMN social_posts.semantic_distance_from_hub IS 'Semantic distance from hub post (0-1, lower is closer)';
