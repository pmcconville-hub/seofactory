# WordPress Integration Plan

**Date:** 2025-01-08
**Status:** Planning
**Priority:** High

## Executive Summary

Implement bidirectional WordPress integration to push generated drafts with images and SEO features to WordPress installations, while maintaining full publication status management and analytics tracking within the CutTheCrap application.

---

## Architecture Overview

### Hybrid Approach: REST API + Custom Plugin

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CutTheCrap Application                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ WordPress        │  │ Publication      │  │ Analytics            │  │
│  │ Connection Mgr   │  │ Status Tracker   │  │ Aggregator           │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                        │              │
│           └─────────────────────┼────────────────────────┘              │
│                                 │                                       │
│                    ┌────────────▼────────────┐                          │
│                    │   WordPress API Client  │                          │
│                    │   (HMAC Signed Requests)│                          │
│                    └────────────┬────────────┘                          │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   WordPress REST API      │
                    │   + Application Passwords │
                    └─────────────┬─────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                        WordPress Installation                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ CutTheCrap       │  │ Post Meta        │  │ Media Library        │  │
│  │ Connector Plugin │  │ (Linked Topic ID)│  │ (Generated Images)   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                         │
│  Plugin Provides:                                                       │
│  • Custom REST endpoints for extended functionality                     │
│  • HMAC request verification                                            │
│  • Webhook dispatcher for content changes                               │
│  • GSC data relay (if site has Search Console access)                   │
│  • Post statistics aggregation                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Source of Truth Model

- **WordPress** is the source of truth for published content
- **App** provides optimization suggestions based on what's live
- **Three-version tracking:**
  1. **App Draft** - Latest optimized version in CutTheCrap
  2. **Published Snapshot** - What we last pushed to WordPress
  3. **WP Current** - What's actually live (may have manual edits)

---

## Database Schema

### New Tables

#### 1. `wordpress_connections`
Stores WordPress site connections per user/project.

```sql
CREATE TABLE wordpress_connections (
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
```

#### 2. `wordpress_publications`
Tracks what has been published to WordPress.

```sql
CREATE TABLE wordpress_publications (
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
```

#### 3. `wordpress_media`
Tracks images uploaded to WordPress media library.

```sql
CREATE TABLE wordpress_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Links
    connection_id UUID NOT NULL REFERENCES wordpress_connections(id) ON DELETE CASCADE,
    publication_id UUID REFERENCES wordpress_publications(id) ON DELETE SET NULL,

    -- App-side image reference
    app_image_url TEXT,          -- Cloudinary URL
    image_type TEXT CHECK (image_type IN ('hero', 'section', 'infographic', 'schema')),
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
```

#### 4. `wordpress_analytics`
Stores analytics data pulled from WordPress/GSC.

```sql
CREATE TABLE wordpress_analytics (
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
```

#### 5. `publication_history`
Audit trail of all publication actions.

```sql
CREATE TABLE publication_history (
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
```

---

## WordPress Plugin Structure

### Plugin: `cutthecrap-connector`

```
cutthecrap-connector/
├── cutthecrap-connector.php          # Main plugin file
├── includes/
│   ├── class-api-handler.php         # Custom REST endpoints
│   ├── class-hmac-verifier.php       # Request signature verification
│   ├── class-webhook-dispatcher.php  # Send webhooks to app
│   ├── class-content-mapper.php      # Map app content to WP format
│   ├── class-media-handler.php       # Handle image uploads
│   ├── class-gsc-relay.php           # GSC data fetching (optional)
│   └── class-analytics-collector.php # Aggregate post stats
├── admin/
│   ├── class-admin-page.php          # Plugin settings page
│   ├── views/
│   │   └── settings-page.php         # Settings UI
│   └── js/
│       └── admin.js                  # Admin JS
├── assets/
│   └── css/
│       └── admin.css
├── languages/
│   └── cutthecrap-connector.pot      # Translation template
└── readme.txt                        # WordPress.org readme
```

### Custom REST Endpoints (Plugin Provides)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cutthecrap/v1/verify` | POST | Verify plugin installation & HMAC |
| `/cutthecrap/v1/post/create` | POST | Create post with full metadata |
| `/cutthecrap/v1/post/{id}/update` | PUT | Update post content |
| `/cutthecrap/v1/post/{id}/status` | GET | Get current status & hash |
| `/cutthecrap/v1/post/{id}/analytics` | GET | Get post statistics |
| `/cutthecrap/v1/media/upload` | POST | Upload image to media library |
| `/cutthecrap/v1/categories` | GET | List categories for mapping |
| `/cutthecrap/v1/gsc/query` | POST | Fetch GSC data (if connected) |
| `/cutthecrap/v1/bulk/status` | POST | Batch status check |

### Webhook Events (Plugin Sends)

```php
// Plugin dispatches webhooks to app on these events:
$webhook_events = [
    'post.updated',      // Content changed in WP
    'post.published',    // Status changed to publish
    'post.unpublished',  // Status changed from publish
    'post.trashed',      // Moved to trash
    'post.restored',     // Restored from trash
    'comment.added',     // New comment on tracked post
];
```

---

## App-Side Services

### New Services

#### 1. `services/wordpress/connectionService.ts`
```typescript
interface WordPressConnection {
  id: string;
  siteUrl: string;
  siteName?: string;
  status: 'pending' | 'verified' | 'error' | 'disconnected';
  pluginVersion?: string;
  lastSyncAt?: Date;
}

interface ConnectionService {
  // Connection management
  createConnection(projectId: string, siteUrl: string, username: string, appPassword: string): Promise<WordPressConnection>;
  verifyConnection(connectionId: string): Promise<{ verified: boolean; pluginVersion?: string; error?: string }>;
  testConnection(connectionId: string): Promise<boolean>;
  disconnectSite(connectionId: string): Promise<void>;

  // List connections
  getConnectionsForProject(projectId: string): Promise<WordPressConnection[]>;
  getConnectionsForUser(userId: string): Promise<WordPressConnection[]>;
}
```

#### 2. `services/wordpress/publicationService.ts`
```typescript
interface PublicationOptions {
  status: 'draft' | 'publish' | 'pending' | 'future';
  scheduledAt?: Date;
  categories?: number[];
  tags?: string[];
  featuredImageId?: number;
  yoastMeta?: {
    focusKeyword?: string;
    metaDescription?: string;
  };
}

interface PublicationService {
  // Publishing
  publishTopic(connectionId: string, topicId: string, options: PublicationOptions): Promise<Publication>;
  updatePublication(publicationId: string, content?: string, options?: Partial<PublicationOptions>): Promise<Publication>;

  // Status management
  getPublicationStatus(topicId: string): Promise<Publication | null>;
  syncStatus(publicationId: string): Promise<Publication>;

  // Bulk operations
  bulkPublish(connectionId: string, topicIds: string[], options: PublicationOptions): Promise<Publication[]>;
  bulkSyncStatus(publicationIds: string[]): Promise<Publication[]>;

  // Conflict handling
  detectConflicts(publicationId: string): Promise<ConflictReport | null>;
  resolveConflict(publicationId: string, resolution: 'keep_app' | 'keep_wp' | 'merge'): Promise<Publication>;
}
```

#### 3. `services/wordpress/mediaService.ts`
```typescript
interface MediaUploadResult {
  wpMediaId: number;
  wpMediaUrl: string;
  thumbnailUrl?: string;
}

interface MediaService {
  // Upload images
  uploadImage(connectionId: string, imageUrl: string, metadata: ImageMetadata): Promise<MediaUploadResult>;
  uploadHeroImage(publicationId: string, imageUrl: string): Promise<MediaUploadResult>;
  uploadSectionImages(publicationId: string, images: SectionImage[]): Promise<MediaUploadResult[]>;

  // Sync
  syncMediaLibrary(connectionId: string): Promise<void>;
}
```

#### 4. `services/wordpress/analyticsService.ts`
```typescript
interface AnalyticsService {
  // Fetch and store
  pullAnalytics(connectionId: string, dateRange: DateRange): Promise<void>;
  pullGscData(connectionId: string, dateRange: DateRange): Promise<void>;

  // Aggregate
  getPublicationAnalytics(publicationId: string, dateRange: DateRange): Promise<AnalyticsData>;
  getProjectAnalytics(projectId: string, dateRange: DateRange): Promise<AggregatedAnalytics>;

  // Performance insights
  getTopPerformingPosts(projectId: string, metric: 'views' | 'clicks' | 'engagement'): Promise<Publication[]>;
  getUnderperformingPosts(projectId: string): Promise<Publication[]>;
}
```

#### 5. `services/wordpress/apiClient.ts`
```typescript
interface WordPressApiClient {
  // Low-level API calls with HMAC signing
  get<T>(connectionId: string, endpoint: string): Promise<T>;
  post<T>(connectionId: string, endpoint: string, data: unknown): Promise<T>;
  put<T>(connectionId: string, endpoint: string, data: unknown): Promise<T>;
  delete(connectionId: string, endpoint: string): Promise<void>;

  // Standard WP REST API
  getPosts(connectionId: string, params?: PostQueryParams): Promise<WpPost[]>;
  getPost(connectionId: string, postId: number): Promise<WpPost>;
  createPost(connectionId: string, post: CreatePostData): Promise<WpPost>;
  updatePost(connectionId: string, postId: number, post: UpdatePostData): Promise<WpPost>;

  // Media
  uploadMedia(connectionId: string, file: Blob, filename: string): Promise<WpMedia>;

  // Custom plugin endpoints
  verifyPlugin(connectionId: string): Promise<PluginVerification>;
  getPostAnalytics(connectionId: string, postId: number): Promise<PostAnalytics>;
}
```

---

## UI Components

### 1. WordPress Connection Manager
**Location:** Project Settings or dedicated tab

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔌 WordPress Connections                           [+ Add Site] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🌐 example.com                                    ✓ Connected│ │
│ │    Plugin v1.2.0 • Last sync: 2 hours ago                   │ │
│ │    12 posts published • 3 drafts                            │ │
│ │    [Sync Now] [Settings] [Disconnect]                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🌐 blog.client2.com                              ⚠ Needs Auth│ │
│ │    Application password expired                              │ │
│ │    [Re-authenticate] [Remove]                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Topic Publication Status
**Location:** Topic card/row in dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 How to Choose the Best CRM for Your Business                 │
│                                                                 │
│ Brief: ✓ Complete    Draft: ✓ 2,450 words                      │
│                                                                 │
│ Publication Status:                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟢 Published on example.com                                 │ │
│ │    https://example.com/best-crm-business/                   │ │
│ │    Published: Dec 15, 2024 • Views: 1,234                   │ │
│ │                                                             │ │
│ │    ⚠️ WP version differs from app (edited 3 days ago)       │ │
│ │    [View Diff] [Pull Changes] [Push Update]                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Edit Brief] [Edit Draft] [Publish to WP ▼]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Publish Modal
**Location:** Triggered from topic actions

```
┌─────────────────────────────────────────────────────────────────┐
│ 📤 Publish to WordPress                                    [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Destination: [example.com              ▼]                       │
│                                                                 │
│ Status:                                                         │
│ ○ Draft (save without publishing)                              │
│ ● Publish immediately                                          │
│ ○ Schedule for: [Dec 20, 2024] [10:00 AM]                      │
│                                                                 │
│ Category: [Marketing ▼]                                         │
│ Tags: [crm, business, software] [+ Add]                        │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ Hero Image:                                                     │
│ ┌──────────────┐                                               │
│ │   [Image]    │  ✓ Generated • 1200x630px                     │
│ │              │  [Change] [Remove]                            │
│ └──────────────┘                                               │
│                                                                 │
│ SEO Settings (Yoast/RankMath):                                 │
│ Focus Keyword: [best crm software               ]              │
│ Meta Description: [Looking for the best CRM? Our compre...]    │
│                                                                 │
│ Schema: ✓ Article + FAQ (3 items)                              │
│                                                                 │
│                              [Cancel] [Publish to WordPress]    │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Content Calendar with Publication Status
**Location:** New tab in dashboard or dedicated view

```
┌─────────────────────────────────────────────────────────────────┐
│ 📅 Content Calendar                    [Month ▼] January 2025   │
├─────────────────────────────────────────────────────────────────┤
│ Mon    Tue    Wed    Thu    Fri    Sat    Sun                  │
│ ─────────────────────────────────────────────────────────────  │
│   1      2      3      4      5      6      7                  │
│                ┌───┐                                           │
│                │🟢│ CRM Guide                                  │
│                └───┘ Published                                 │
│ ─────────────────────────────────────────────────────────────  │
│   8      9     10     11     12     13     14                  │
│        ┌───┐        ┌───┐                                      │
│        │🟡│        │⏰│ Email Marketing                        │
│        └───┘        └───┘ Scheduled                            │
│        Draft                                                    │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ Legend: 🟢 Published  🟡 Draft  ⏰ Scheduled  ⚪ Planned        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Image Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMAGE GENERATION & SYNC FLOW                 │
└─────────────────────────────────────────────────────────────────┘

1. During Draft Creation (Pass 4 - Visual Semantics):
   ┌─────────────┐
   │ AI inserts  │ → [hero_image], [section_1_diagram], etc.
   │ placeholders│
   └─────────────┘

2. User Triggers Image Generation:
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │ Parse       │ →   │ Generate    │ →   │ Store in    │
   │ placeholders│     │ via DALL-E  │     │ Cloudinary  │
   └─────────────┘     └─────────────┘     └─────────────┘

3. User Reviews & Approves:
   ┌─────────────┐
   │ Show preview│ → User can regenerate, edit alt text, or skip
   │ for approval│
   └─────────────┘

4. On Publish to WordPress:
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │ Upload each │ →   │ Get WP      │ →   │ Replace     │
   │ image to WP │     │ media URLs  │     │ placeholders│
   └─────────────┘     └─────────────┘     │ in content  │
                                            └─────────────┘

5. Store References:
   ┌─────────────────────────────────────┐
   │ wordpress_media table stores:       │
   │ - app_image_url (Cloudinary)        │
   │ - wp_media_url (WordPress)          │
   │ - placeholder_id (links to draft)   │
   └─────────────────────────────────────┘
```

### Placeholder Format (Visual Semantics)
```html
<!-- In article draft -->
[IMAGE:hero|alt:Executive comparing CRM dashboards|caption:Choosing the right CRM]

[IMAGE:section_2|type:diagram|alt:CRM feature comparison matrix]

[IMAGE:section_5|type:infographic|alt:5 steps to CRM implementation]
```

### Image Generation Status Tracking
```typescript
interface ImageGenerationStatus {
  placeholderId: string;
  type: 'hero' | 'section' | 'infographic' | 'diagram';
  status: 'pending' | 'generating' | 'generated' | 'approved' | 'failed';
  appUrl?: string;      // Cloudinary URL
  wpMediaId?: number;   // WordPress media ID
  wpUrl?: string;       // WordPress URL
  altText: string;
  caption?: string;
  error?: string;
}
```

---

## Conflict Resolution

### Conflict Detection
```typescript
interface ConflictReport {
  publicationId: string;
  detectedAt: Date;

  appVersion: {
    hash: string;
    lastModified: Date;
    wordCount: number;
  };

  wpVersion: {
    hash: string;
    lastModified: Date;
    wordCount: number;
    modifiedBy?: string;  // WP user who edited
  };

  diffSummary: {
    sectionsChanged: number;
    wordsAdded: number;
    wordsRemoved: number;
  };
}
```

### Resolution Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Content Conflict Detected                               [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ The WordPress version has been edited since your last push.    │
│                                                                 │
│ App Version (Jan 5):        WordPress Version (Jan 7):         │
│ ┌─────────────────────┐     ┌─────────────────────┐            │
│ │ 2,450 words         │     │ 2,520 words         │            │
│ │ Last edit: You      │     │ Last edit: Editor   │            │
│ └─────────────────────┘     └─────────────────────┘            │
│                                                                 │
│ [View Side-by-Side Diff]                                       │
│                                                                 │
│ Resolution Options:                                             │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ○ Keep App Version                                          ││
│ │   Overwrite WordPress with your app version                 ││
│ │                                                             ││
│ │ ○ Keep WordPress Version                                    ││
│ │   Update app to match WordPress (pull changes)              ││
│ │                                                             ││
│ │ ● Smart Merge (Recommended)                                 ││
│ │   Attempt to merge both versions automatically              ││
│ │   Manual review required for conflicting sections           ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                    [Cancel] [Apply Resolution]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Model

### Authentication
1. **Application Passwords** (WordPress native)
   - User generates in WP Admin → Users → Profile
   - Stored encrypted in `wordpress_connections.api_password_encrypted`

2. **HMAC Request Signing**
   - Each request includes timestamp + signature
   - Plugin verifies signature before processing
   - Prevents replay attacks

```typescript
// Request signing
function signRequest(payload: unknown, secret: string): string {
  const timestamp = Date.now();
  const data = JSON.stringify({ payload, timestamp });
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  return `${timestamp}.${signature}`;
}

// Headers sent with each request
{
  'Authorization': 'Basic ' + btoa(username + ':' + appPassword),
  'X-CutTheCrap-Signature': signRequest(payload, hmacSecret),
  'X-CutTheCrap-Timestamp': timestamp
}
```

### Plugin Verification Flow
```
1. User enters WP site URL in app
2. App sends verification request to /cutthecrap/v1/verify
3. Plugin responds with:
   - Plugin version
   - Unique site ID
   - Shared HMAC secret (generated on first connection)
4. App stores encrypted credentials
5. All subsequent requests are HMAC-signed
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)
**Scope:** Database, basic connection, simple publish

1. Create database migrations for all 5 tables
2. Implement `connectionService.ts` - add/verify/remove connections
3. Implement `apiClient.ts` - basic WP REST API calls with auth
4. Create WordPress plugin skeleton with:
   - Plugin header and activation
   - `/cutthecrap/v1/verify` endpoint
   - HMAC verification class
5. Build Connection Manager UI component
6. Implement basic `publicationService.ts` - create/update posts

**Deliverable:** Can connect to WP site and push a draft as WP post

### Phase 2: Full Publishing Flow
**Scope:** Images, SEO meta, scheduling, status sync

1. Implement `mediaService.ts` - image upload flow
2. Extend plugin with media endpoints
3. Add SEO meta support (Yoast/RankMath detection)
4. Implement scheduling functionality
5. Build Publish Modal UI
6. Add status sync and polling
7. Implement webhook receiver for status changes
8. Extend plugin with webhook dispatcher

**Deliverable:** Full publish flow with images, SEO, and status tracking

### Phase 3: Conflict Resolution & Analytics
**Scope:** Version tracking, conflicts, analytics pull

1. Implement content hashing and version comparison
2. Build conflict detection logic
3. Create smart merge algorithm
4. Build Conflict Resolution UI
5. Implement `analyticsService.ts`
6. Extend plugin with analytics aggregation
7. Optional: GSC data relay if site has access
8. Build analytics display in dashboard

**Deliverable:** Bidirectional sync with conflict handling and analytics

### Phase 4: Content Calendar & Polish
**Scope:** Calendar view, bulk operations, polish

1. Build Content Calendar component
2. Implement bulk publish/schedule operations
3. Add publication filtering and search
4. Create publication history viewer
5. Add notification system for sync events
6. Performance optimization and caching
7. Documentation and user guides

**Deliverable:** Complete feature-rich WordPress integration

---

## WordPress Plugin Skeleton Explained

A "plugin skeleton" is the minimal foundational structure needed for a WordPress plugin to be recognized and activated, but without the full feature implementation. It includes:

### What's Included:

1. **Main Plugin File** (`cutthecrap-connector.php`)
   - Plugin header comment (name, version, author, description)
   - Activation/deactivation hooks
   - Basic initialization
   - Autoloader for classes

2. **Directory Structure**
   - Proper folder organization for classes, admin, assets
   - Empty placeholder files where features will go

3. **Core Classes (Stubs)**
   - Class files with method signatures but minimal implementation
   - Just enough to not throw errors

4. **Admin Settings Page**
   - Basic settings page UI
   - Fields for entering app connection details

5. **One Working Endpoint**
   - `/cutthecrap/v1/verify` - proves plugin is installed and responds

### Why Start with a Skeleton:

1. **Verify WordPress compatibility** - ensures proper activation
2. **Test connection flow** - app can detect plugin is installed
3. **Establish patterns** - sets coding standards for full implementation
4. **Incremental development** - add features one at a time
5. **User testing** - can test install process with real users early

### Skeleton Code Example:

```php
<?php
/**
 * Plugin Name: CutTheCrap Connector
 * Plugin URI: https://cutthecrap.net
 * Description: Connect your WordPress site to CutTheCrap for automated content publishing
 * Version: 0.1.0
 * Author: CutTheCrap
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;

define('CUTTHECRAP_VERSION', '0.1.0');
define('CUTTHECRAP_PLUGIN_DIR', plugin_dir_path(__FILE__));

// Autoloader
spl_autoload_register(function ($class) {
    if (strpos($class, 'CutTheCrap\\') !== 0) return;
    $path = CUTTHECRAP_PLUGIN_DIR . 'includes/class-' .
            strtolower(str_replace(['CutTheCrap\\', '_'], ['', '-'], $class)) . '.php';
    if (file_exists($path)) require_once $path;
});

// Initialize
add_action('plugins_loaded', function() {
    // Register REST routes
    add_action('rest_api_init', [new CutTheCrap\Api_Handler(), 'register_routes']);

    // Admin page
    if (is_admin()) {
        new CutTheCrap\Admin_Page();
    }
});

// Activation
register_activation_hook(__FILE__, function() {
    // Create options, maybe create tables
    add_option('cutthecrap_hmac_secret', wp_generate_password(32, false));
});
```

---

## Success Metrics

1. **Connection reliability** - 99%+ successful API calls
2. **Sync latency** - Status updates within 60 seconds
3. **Conflict rate** - <5% of publications have conflicts
4. **User adoption** - 80%+ of users with WP sites connect
5. **Time savings** - 75% reduction in manual copy/paste workflow

---

## Dependencies

### App-Side
- Existing Supabase infrastructure
- Cloudinary for image storage (already in use)
- New npm packages: none required (use native fetch)

### WordPress-Side
- WordPress 5.6+ (Application Passwords introduced)
- PHP 7.4+
- Optional: Yoast SEO or RankMath for SEO meta
- Optional: Jetpack or similar for enhanced analytics

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WordPress security plugins blocking API | Document whitelist requirements, HMAC proves legitimacy |
| Large images failing upload | Chunk uploads, compression, timeout handling |
| Plugin conflicts | Namespace all code, minimal hooks, test with popular plugins |
| Rate limiting by WP hosts | Implement backoff, queue operations, batch where possible |
| User loses WP access | Graceful degradation, clear status indicators |
