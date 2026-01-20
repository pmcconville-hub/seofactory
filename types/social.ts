// types/social.ts
// TypeScript types for the Social Media Publishing System

// ============================================================================
// PLATFORM TYPES
// ============================================================================

/**
 * Supported social media platforms
 */
export type SocialMediaPlatform = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'pinterest';

/**
 * Post type variations per platform
 */
export type SocialPostType = 'single' | 'thread' | 'carousel' | 'story' | 'pin';

/**
 * Template types for social posts
 */
export type SocialTemplateType =
  | 'key_takeaway'      // Single key insight from article
  | 'entity_spotlight'  // Focus on one entity
  | 'question_hook'     // Engagement question
  | 'stat_highlight'    // Statistical fact
  | 'tip_series'        // Actionable tip
  | 'quote_card'        // Notable quote
  | 'listicle'          // Quick list format
  | 'hub_announcement'  // Main article announcement
  | 'spoke_teaser';     // Supporting post teaser

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

/**
 * Campaign status progression
 */
export type SocialCampaignStatus =
  | 'draft'             // In creation
  | 'ready'             // All posts finalized
  | 'exported'          // Exported for posting
  | 'partially_posted'  // Some posts published
  | 'completed';        // All posts published

/**
 * Individual post status
 */
export type SocialPostStatus =
  | 'draft'     // In creation/editing
  | 'ready'     // Finalized, ready to export
  | 'exported'  // Exported at least once
  | 'posted';   // Manually marked as posted

/**
 * Social campaign (hub-spoke grouping)
 */
export interface SocialCampaign {
  id: string;
  user_id: string;
  topic_id: string;
  job_id?: string;

  campaign_name?: string;
  hub_platform?: SocialMediaPlatform;

  // UTM configuration
  utm_source?: string;
  utm_medium: string;
  utm_campaign?: string;

  // Status
  status: SocialCampaignStatus;

  // Semantic compliance
  overall_compliance_score?: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a campaign
 */
export interface SocialCampaignInput {
  topic_id: string;
  job_id?: string;
  campaign_name?: string;
  hub_platform?: SocialMediaPlatform;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

// ============================================================================
// POST TYPES
// ============================================================================

/**
 * Thread segment for multi-part posts
 */
export interface ThreadSegment {
  index: number;
  text: string;
}

/**
 * Image instructions for post visuals
 */
export interface ImageInstructions {
  description: string;
  alt_text: string;
  dimensions: {
    width: number;
    height: number;
    aspect_ratio: string;
  };
  source_placeholder_id?: string;
}

/**
 * UTM parameters for tracking
 */
export interface UTMParameters {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
}

/**
 * EAV triple stored with post
 */
export interface PostEAVTriple {
  entity: string;
  attribute: string;
  value: string;
  category?: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON';
}

/**
 * Social media post
 */
export interface SocialPost {
  id: string;
  campaign_id?: string;
  topic_id: string;
  job_id?: string;
  user_id: string;

  // Hub-spoke relationship
  is_hub: boolean;
  spoke_position?: number;  // 1-7 for supporting posts

  // Platform & type
  platform: SocialMediaPlatform;
  post_type: SocialPostType;

  // Content
  content_text: string;
  content_thread?: ThreadSegment[];
  hashtags?: string[];
  mentions?: string[];

  // Media instructions
  image_instructions?: ImageInstructions;

  // Link & tracking
  link_url?: string;
  utm_parameters?: UTMParameters;
  short_link?: string;

  // Posting instructions
  posting_instructions?: string;
  optimal_posting_time?: string;

  // Manual tracking
  manually_posted_at?: string;
  platform_post_url?: string;

  // Semantic compliance
  semantic_compliance_score?: number;
  eav_triple?: PostEAVTriple;
  entities_mentioned?: string[];
  semantic_distance_from_hub?: number;

  // Status
  status: SocialPostStatus;
  exported_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a social post
 */
export interface SocialPostInput {
  campaign_id?: string;
  topic_id: string;
  job_id?: string;
  is_hub?: boolean;
  spoke_position?: number;
  platform: SocialMediaPlatform;
  post_type: SocialPostType;
  content_text: string;
  content_thread?: ThreadSegment[];
  hashtags?: string[];
  mentions?: string[];
  image_instructions?: ImageInstructions;
  link_url?: string;
  utm_parameters?: UTMParameters;
  eav_triple?: PostEAVTriple;
  entities_mentioned?: string[];
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

/**
 * Hashtag strategy configuration
 */
export interface HashtagStrategy {
  count: number;
  placement: 'start' | 'end' | 'integrated' | 'comment';
  branded: string[];
  niche: string[];
}

/**
 * Character limit configuration
 */
export interface CharacterLimits {
  main: number;
  preview?: number;
  thread_segment?: number;
}

/**
 * Image specifications
 */
export interface ImageSpecs {
  aspect_ratio: string;
  width: number;
  height: number;
  max_file_size_mb: number;
  formats: string[];
}

/**
 * Social post template
 */
export interface SocialPostTemplate {
  id: string;
  user_id?: string;
  map_id?: string;

  platform: SocialMediaPlatform;
  template_name: string;
  template_type: SocialTemplateType;

  // Content pattern with placeholders
  content_pattern: string;

  // Platform-specific settings
  hashtag_strategy?: HashtagStrategy;
  cta_templates?: string[];
  character_limits?: CharacterLimits;
  image_specs?: ImageSpecs;

  is_default: boolean;
  created_at: string;
}

/**
 * Template placeholders available in content patterns
 */
export interface TemplatePlaceholders {
  title: string;
  entity: string;
  attribute: string;
  value: string;
  key_takeaway: string;
  hook: string;
  cta: string;
  hashtags: string;
  link: string;
  meta_description: string;
}

// ============================================================================
// ENTITY HASHTAG MAPPING TYPES
// ============================================================================

/**
 * Entity to hashtag mapping
 */
export interface EntityHashtagMapping {
  id: string;
  map_id: string;
  user_id: string;

  entity_name: string;
  entity_type?: string;
  wikidata_id?: string;

  platform: SocialMediaPlatform;
  primary_hashtag: string;
  secondary_hashtags?: string[];
  branded_hashtags?: string[];

  created_at: string;
}

/**
 * Input for creating hashtag mapping
 */
export interface EntityHashtagMappingInput {
  map_id: string;
  entity_name: string;
  entity_type?: string;
  wikidata_id?: string;
  platform: SocialMediaPlatform;
  primary_hashtag: string;
  secondary_hashtags?: string[];
  branded_hashtags?: string[];
}

// ============================================================================
// PLATFORM GUIDE TYPES
// ============================================================================

/**
 * Optimal posting times
 */
export interface OptimalPostingTimes {
  days: string[];  // e.g., ["Tuesday", "Wednesday", "Thursday"]
  hours: string[]; // e.g., ["10am-12pm", "2pm-4pm"]
}

/**
 * Platform posting guide (reference data)
 */
export interface PlatformPostingGuide {
  id: string;
  platform: SocialMediaPlatform;

  // Specifications
  character_limits: {
    main: number;
    preview?: number;
    thread_segment?: number;
    premium?: number;
  };
  image_specs: {
    landscape?: { width: number; height: number };
    square?: { width: number; height: number };
    portrait?: { width: number; height: number };
    story?: { width: number; height: number };
    pin?: { width: number; height: number };
    card?: { width: number; height: number };
    ratio?: string;
    max_file_size_mb: number;
    formats: string[];
  };
  hashtag_guidelines: {
    optimal_count: number;
    max_count: number;
    placement: string;
    strategy: string;
  };

  // Instructions
  posting_instructions: string;
  best_practices?: string;
  optimal_times?: OptimalPostingTimes;

  // Links
  help_url?: string;

  updated_at: string;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

/**
 * Export type options
 */
export type ExportType = 'single_post' | 'full_campaign' | 'bulk_package';

/**
 * Export format options
 */
export type ExportFormat = 'clipboard' | 'json' | 'txt' | 'zip';

/**
 * Export history entry
 */
export interface SocialExportHistory {
  id: string;
  campaign_id?: string;
  user_id: string;

  export_type?: ExportType;
  export_format?: ExportFormat;
  posts_included?: string[];

  created_at: string;
}

/**
 * Single post export data
 */
export interface SinglePostExport {
  post: SocialPost;
  instructions: string;
  image_requirements: string;
  link_with_utm: string;
}

/**
 * Full campaign export data
 */
export interface CampaignExport {
  campaign: SocialCampaign;
  posts: SocialPost[];
  by_platform: Record<SocialMediaPlatform, SocialPost[]>;
  hub_post?: SocialPost;
  spoke_posts: SocialPost[];
  links: {
    original: string;
    with_utm: Record<SocialMediaPlatform, string>;
  };
}

/**
 * Bulk export package structure
 */
export interface BulkExportPackage {
  readme: string;
  campaign_summary: CampaignExport;
  platforms: {
    linkedin?: PlatformExportFolder;
    twitter?: PlatformExportFolder;
    facebook?: PlatformExportFolder;
    instagram?: PlatformExportFolder;
    pinterest?: PlatformExportFolder;
  };
  assets: {
    links: Record<string, string>;
  };
}

/**
 * Per-platform export folder contents
 */
export interface PlatformExportFolder {
  post_content: string;
  instructions: string;
  image_requirements: string;
  thread_content?: string;
  carousel_slides?: object;
}

// ============================================================================
// SEMANTIC COMPLIANCE TYPES
// ============================================================================

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  rule: string;
  passed: boolean;
  score: number;
  max_score: number;
  message: string;
  suggestions?: string[];
}

/**
 * Full compliance report for a post
 */
export interface PostComplianceReport {
  post_id: string;
  overall_score: number;  // 0-100
  checks: ComplianceCheckResult[];

  // Specific metrics
  entity_consistency: {
    score: number;
    entities_found: string[];
    ambiguous_pronouns: string[];
  };
  eav_architecture: {
    score: number;
    eav_count: number;
    eav_quality: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON' | 'none';
  };
  information_density: {
    score: number;
    facts_per_100_chars: number;
    filler_word_ratio: number;
    banned_phrases_found: string[];
  };
  semantic_distance: {
    score: number;
    distance_from_hub: number;
    within_threshold: boolean;
  };
}

/**
 * Campaign-level compliance report
 */
export interface CampaignComplianceReport {
  campaign_id: string;
  overall_score: number;
  hub_spoke_coverage: {
    score: number;
    has_hub: boolean;
    spoke_count: number;
    eav_coverage: number;  // Percentage of available EAVs covered
  };
  post_reports: PostComplianceReport[];
  recommendations: string[];
}

// ============================================================================
// TRANSFORMATION TYPES
// ============================================================================

/**
 * Source data for transformation from article
 */
export interface ArticleTransformationSource {
  job_id: string;
  topic_id: string;
  title: string;
  meta_description: string;
  link_url: string;

  // Language/Region for localized content generation
  // ISO 639-1 language code (e.g., 'en', 'nl', 'de', 'fr', 'es')
  language?: string;

  // Extracted from content generation
  key_takeaways: string[];
  schema_entities: Array<{
    name: string;
    type: string;
    wikidata_id?: string;
  }>;
  contextual_vectors: Array<{
    entity: string;
    attribute: string;
    value: string;
    category: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON';
  }>;
  image_placeholders: Array<{
    id: string;
    type: string;
    alt_text: string;
    caption?: string;
  }>;
}

/**
 * Platform selection for transformation
 */
export interface PlatformSelection {
  platform: SocialMediaPlatform;
  enabled: boolean;
  template_type: SocialTemplateType;
  post_count: number;  // How many posts for this platform
}

/**
 * Transformation configuration
 */
export interface TransformationConfig {
  platforms: PlatformSelection[];
  hub_platform: SocialMediaPlatform;
  utm_source?: string;
  utm_campaign?: string;
  include_hashtags: boolean;
  max_spoke_posts: number;  // Default 7
}

/**
 * Transformation result
 */
export interface TransformationResult {
  success: boolean;
  campaign?: SocialCampaign;
  posts?: SocialPost[];
  compliance_report?: CampaignComplianceReport;
  error?: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Transform modal state
 */
export interface TransformModalState {
  isOpen: boolean;
  topic_id?: string;
  job_id?: string;
  step: 'select_platforms' | 'configure' | 'preview' | 'generating' | 'complete';
}

/**
 * Post editor state
 */
export interface PostEditorState {
  post_id?: string;
  isDirty: boolean;
  characterCount: number;
  characterLimit: number;
  complianceScore?: number;
}

/**
 * Export modal state
 */
export interface ExportModalState {
  isOpen: boolean;
  campaign_id?: string;
  post_ids?: string[];
  export_type: ExportType;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Platform display configuration
 */
export const SOCIAL_PLATFORM_CONFIG: Record<SocialMediaPlatform, {
  name: string;
  icon: string;
  color: string;
  default_post_type: SocialPostType;
}> = {
  linkedin: {
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    default_post_type: 'single'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: 'twitter',
    color: '#000000',
    default_post_type: 'thread'
  },
  facebook: {
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    default_post_type: 'single'
  },
  instagram: {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    default_post_type: 'carousel'
  },
  pinterest: {
    name: 'Pinterest',
    icon: 'pinterest',
    color: '#BD081C',
    default_post_type: 'pin'
  }
};

/**
 * Banned filler phrases for compliance checking
 */
export const BANNED_FILLER_PHRASES = [
  'in this post',
  'let me share',
  'i thought i would',
  'overall',
  'basically',
  'in conclusion',
  'to sum up',
  'as you can see',
  'it goes without saying',
  'needless to say'
];

/**
 * Maximum semantic distance threshold for hub-spoke
 */
export const MAX_SEMANTIC_DISTANCE = 0.7;

/**
 * Cross-platform link distance threshold
 */
export const CROSS_PLATFORM_LINK_THRESHOLD = 0.5;

/**
 * Target compliance score
 */
export const TARGET_COMPLIANCE_SCORE = 85;
