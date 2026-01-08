-- WordPress Integration Tables
-- Enables bidirectional content sync between CutTheCrap and WordPress installations

-- ============================================================================
-- 1. wordpress_connections - Store WordPress site connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS wordpress_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Connection details
    site_url TEXT NOT NULL,
    site_name TEXT,
    api_username TEXT NOT NULL,
    api_password_encrypted TEXT NOT NULL,  -- Application Password, encrypted

    -- Plugin verification
    plugin_version TEXT,
    plugin_verified_at TIMESTAMPTZ,
    hmac_secret_encrypted TEXT,  -- For request signing

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'error', 'disconnected')),
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, site_url)
);

-- ============================================================================
-- 2. wordpress_publications - Track what has been published to WordPress
-- ============================================================================
CREATE TABLE IF NOT EXISTS wordpress_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Links
    connection_id UUID NOT NULL REFERENCES wordpress_connections(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    brief_id UUID REFERENCES content_briefs(id) ON DELETE SET NULL,

    -- WordPress post reference
    wp_post_id BIGINT NOT NULL,
    wp_post_url TEXT,
    wp_post_slug TEXT,

    -- Publication status
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft',           -- Pushed as WP draft
        'pending_review',  -- Awaiting approval in WP
        'scheduled',       -- Scheduled for future
        'published',       -- Live on site
        'unpublished',     -- Was published, now draft
        'trashed'          -- In WP trash
    )),

    -- Scheduling
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    -- Version tracking
    app_version_hash TEXT,      -- Hash of content when pushed
    wp_version_hash TEXT,       -- Hash of content currently in WP
    has_wp_changes BOOLEAN DEFAULT FALSE,  -- True if WP content differs from pushed

    -- Sync metadata
    last_pushed_at TIMESTAMPTZ,
    last_pulled_at TIMESTAMPTZ,
    last_sync_status TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(connection_id, topic_id)
);

-- ============================================================================
-- 3. wordpress_media - Track images uploaded to WordPress media library
-- ============================================================================
CREATE TABLE IF NOT EXISTS wordpress_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Links
    connection_id UUID NOT NULL REFERENCES wordpress_connections(id) ON DELETE CASCADE,
    publication_id UUID REFERENCES wordpress_publications(id) ON DELETE SET NULL,

    -- App-side image reference
    app_image_url TEXT,          -- Cloudinary URL
    image_type TEXT CHECK (image_type IN ('hero', 'section', 'infographic', 'diagram', 'schema')),
    placeholder_id TEXT,          -- Links to visual_semantics placeholder

    -- WordPress media reference
    wp_media_id BIGINT NOT NULL,
    wp_media_url TEXT NOT NULL,
    wp_thumbnail_url TEXT,

    -- Metadata
    alt_text TEXT,
    caption TEXT,
    width INT,
    height INT,
    file_size BIGINT,
    mime_type TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(connection_id, wp_media_id)
);

-- ============================================================================
-- 4. wordpress_analytics - Store analytics data pulled from WordPress/GSC
-- ============================================================================
CREATE TABLE IF NOT EXISTS wordpress_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    publication_id UUID NOT NULL REFERENCES wordpress_publications(id) ON DELETE CASCADE,

    -- Time period
    date DATE NOT NULL,

    -- WordPress stats (from Jetpack or similar)
    wp_views INT DEFAULT 0,
    wp_visitors INT DEFAULT 0,
    wp_comments INT DEFAULT 0,

    -- GSC data (if available through plugin)
    gsc_impressions INT DEFAULT 0,
    gsc_clicks INT DEFAULT 0,
    gsc_ctr DECIMAL(5,4),
    gsc_position DECIMAL(5,2),

    -- Top queries for this post (JSON array)
    gsc_queries JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(publication_id, date)
);

-- ============================================================================
-- 5. publication_history - Audit trail of all publication actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS publication_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    publication_id UUID NOT NULL REFERENCES wordpress_publications(id) ON DELETE CASCADE,

    action TEXT NOT NULL CHECK (action IN (
        'created',         -- Initial push
        'updated',         -- Content update pushed
        'status_changed',  -- Draft -> Published, etc.
        'media_added',     -- Images uploaded
        'pulled',          -- Content pulled from WP
        'conflict_detected',
        'conflict_resolved',
        'unpublished',
        'deleted'
    )),

    -- What changed
    previous_status TEXT,
    new_status TEXT,
    content_diff_summary TEXT,  -- Brief description of changes

    -- Who/what triggered
    triggered_by TEXT CHECK (triggered_by IN ('user', 'sync', 'webhook', 'schedule')),

    -- Snapshots for conflict resolution
    app_content_snapshot TEXT,
    wp_content_snapshot TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- wordpress_connections
CREATE INDEX IF NOT EXISTS idx_wp_connections_user ON wordpress_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_wp_connections_project ON wordpress_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_wp_connections_status ON wordpress_connections(status);

-- wordpress_publications
CREATE INDEX IF NOT EXISTS idx_wp_publications_connection ON wordpress_publications(connection_id);
CREATE INDEX IF NOT EXISTS idx_wp_publications_topic ON wordpress_publications(topic_id);
CREATE INDEX IF NOT EXISTS idx_wp_publications_status ON wordpress_publications(status);
CREATE INDEX IF NOT EXISTS idx_wp_publications_has_changes ON wordpress_publications(has_wp_changes) WHERE has_wp_changes = TRUE;

-- wordpress_media
CREATE INDEX IF NOT EXISTS idx_wp_media_connection ON wordpress_media(connection_id);
CREATE INDEX IF NOT EXISTS idx_wp_media_publication ON wordpress_media(publication_id);

-- wordpress_analytics
CREATE INDEX IF NOT EXISTS idx_wp_analytics_publication ON wordpress_analytics(publication_id);
CREATE INDEX IF NOT EXISTS idx_wp_analytics_date ON wordpress_analytics(date);

-- publication_history
CREATE INDEX IF NOT EXISTS idx_pub_history_publication ON publication_history(publication_id);
CREATE INDEX IF NOT EXISTS idx_pub_history_action ON publication_history(action);
CREATE INDEX IF NOT EXISTS idx_pub_history_created ON publication_history(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE wordpress_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordpress_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordpress_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordpress_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_history ENABLE ROW LEVEL SECURITY;

-- wordpress_connections policies
CREATE POLICY "Users can view own connections"
    ON wordpress_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
    ON wordpress_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
    ON wordpress_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
    ON wordpress_connections FOR DELETE
    USING (auth.uid() = user_id);

-- wordpress_publications policies (through connection ownership)
CREATE POLICY "Users can view publications through connection"
    ON wordpress_publications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_connections wc
            WHERE wc.id = wordpress_publications.connection_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert publications through connection"
    ON wordpress_publications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM wordpress_connections wc
            WHERE wc.id = wordpress_publications.connection_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update publications through connection"
    ON wordpress_publications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_connections wc
            WHERE wc.id = wordpress_publications.connection_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete publications through connection"
    ON wordpress_publications FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_connections wc
            WHERE wc.id = wordpress_publications.connection_id
            AND wc.user_id = auth.uid()
        )
    );

-- wordpress_media policies (through connection ownership)
CREATE POLICY "Users can view media through connection"
    ON wordpress_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_connections wc
            WHERE wc.id = wordpress_media.connection_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert media through connection"
    ON wordpress_media FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM wordpress_connections wc
            WHERE wc.id = wordpress_media.connection_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update media through connection"
    ON wordpress_media FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_connections wc
            WHERE wc.id = wordpress_media.connection_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete media through connection"
    ON wordpress_media FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_connections wc
            WHERE wc.id = wordpress_media.connection_id
            AND wc.user_id = auth.uid()
        )
    );

-- wordpress_analytics policies (through publication -> connection)
CREATE POLICY "Users can view analytics through publication"
    ON wordpress_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_publications wp
            JOIN wordpress_connections wc ON wc.id = wp.connection_id
            WHERE wp.id = wordpress_analytics.publication_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert analytics through publication"
    ON wordpress_analytics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM wordpress_publications wp
            JOIN wordpress_connections wc ON wc.id = wp.connection_id
            WHERE wp.id = wordpress_analytics.publication_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update analytics through publication"
    ON wordpress_analytics FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_publications wp
            JOIN wordpress_connections wc ON wc.id = wp.connection_id
            WHERE wp.id = wordpress_analytics.publication_id
            AND wc.user_id = auth.uid()
        )
    );

-- publication_history policies (through publication -> connection)
CREATE POLICY "Users can view history through publication"
    ON publication_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wordpress_publications wp
            JOIN wordpress_connections wc ON wc.id = wp.connection_id
            WHERE wp.id = publication_history.publication_id
            AND wc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert history through publication"
    ON publication_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM wordpress_publications wp
            JOIN wordpress_connections wc ON wc.id = wp.connection_id
            WHERE wp.id = publication_history.publication_id
            AND wc.user_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get publication status for a topic
CREATE OR REPLACE FUNCTION get_topic_publication_status(p_topic_id UUID)
RETURNS TABLE (
    connection_id UUID,
    site_url TEXT,
    site_name TEXT,
    wp_post_id BIGINT,
    wp_post_url TEXT,
    status TEXT,
    published_at TIMESTAMPTZ,
    has_wp_changes BOOLEAN,
    last_pushed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wc.id as connection_id,
        wc.site_url,
        wc.site_name,
        wp.wp_post_id,
        wp.wp_post_url,
        wp.status,
        wp.published_at,
        wp.has_wp_changes,
        wp.last_pushed_at
    FROM wordpress_publications wp
    JOIN wordpress_connections wc ON wc.id = wp.connection_id
    WHERE wp.topic_id = p_topic_id
    AND wc.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all publications for a project
CREATE OR REPLACE FUNCTION get_project_publications(p_project_id UUID)
RETURNS TABLE (
    publication_id UUID,
    topic_id UUID,
    topic_title TEXT,
    site_url TEXT,
    wp_post_url TEXT,
    status TEXT,
    published_at TIMESTAMPTZ,
    has_wp_changes BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wp.id as publication_id,
        wp.topic_id,
        t.title as topic_title,
        wc.site_url,
        wp.wp_post_url,
        wp.status,
        wp.published_at,
        wp.has_wp_changes
    FROM wordpress_publications wp
    JOIN wordpress_connections wc ON wc.id = wp.connection_id
    JOIN topics t ON t.id = wp.topic_id
    JOIN topical_maps tm ON tm.id = t.map_id
    WHERE tm.project_id = p_project_id
    AND wc.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update connection timestamp
CREATE OR REPLACE FUNCTION update_wp_connection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wp_connection_updated
    BEFORE UPDATE ON wordpress_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_wp_connection_timestamp();

-- Function to update publication timestamp
CREATE OR REPLACE FUNCTION update_wp_publication_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wp_publication_updated
    BEFORE UPDATE ON wordpress_publications
    FOR EACH ROW
    EXECUTE FUNCTION update_wp_publication_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE wordpress_connections IS 'WordPress site connections for content publishing';
COMMENT ON TABLE wordpress_publications IS 'Tracks content published to WordPress sites';
COMMENT ON TABLE wordpress_media IS 'Media files uploaded to WordPress media library';
COMMENT ON TABLE wordpress_analytics IS 'Analytics data pulled from WordPress and GSC';
COMMENT ON TABLE publication_history IS 'Audit trail of publication actions';

COMMENT ON COLUMN wordpress_connections.api_password_encrypted IS 'WordPress Application Password, encrypted at rest';
COMMENT ON COLUMN wordpress_connections.hmac_secret_encrypted IS 'Shared secret for HMAC request signing';
COMMENT ON COLUMN wordpress_publications.app_version_hash IS 'SHA256 hash of content when last pushed from app';
COMMENT ON COLUMN wordpress_publications.wp_version_hash IS 'SHA256 hash of content currently in WordPress';
COMMENT ON COLUMN wordpress_publications.has_wp_changes IS 'True if WordPress content differs from last pushed version';
