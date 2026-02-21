/**
 * Navigation Types Module
 *
 * Contains navigation and foundation page types including:
 * - FoundationPage: Core site pages (About, Contact, etc.)
 * - NavigationStructure: Header/footer navigation config
 * - NavigationLink: Individual navigation links
 * - NAPData: Name, Address, Phone for E-A-T
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/navigation
 */

// ============================================================================
// FOUNDATION PAGE TYPES
// ============================================================================

/**
 * Foundation page type
 */
export type FoundationPageType =
  | 'homepage'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'author';

/**
 * Foundation page section specification
 */
export interface FoundationPageSection {
  heading: string;
  purpose?: string;
  required?: boolean;
  content_type?: 'text' | 'team_grid' | 'faq' | 'contact_form' | 'map' | 'list';
  order?: number;
}

/**
 * Office location for multi-location support
 */
export interface OfficeLocation {
  id: string;
  name: string;                    // e.g., "Headquarters", "Amsterdam Office"
  is_headquarters: boolean;
  address: string;
  city?: string;
  country?: string;                // ISO code: "NL", "US", "DE"
  phone: string;
  email?: string;
}

/**
 * NAP (Name, Address, Phone) data for E-A-T
 */
export interface NAPData {
  company_name: string;
  // Primary location fields (backward compatible)
  address: string;
  phone: string;
  email: string;
  founded_year?: string;
  // Multi-location support
  locations?: OfficeLocation[];
}

/**
 * Foundation page specification
 */
export interface FoundationPage {
  id: string;
  map_id: string;
  user_id?: string;
  page_type: FoundationPageType;
  title: string;
  slug: string;
  meta_description?: string;
  h1_template?: string;
  schema_type?: 'Organization' | 'AboutPage' | 'ContactPage' | 'WebPage';

  // Content structure hints
  sections?: FoundationPageSection[];

  // E-A-T fields (for about/contact)
  nap_data?: NAPData;

  // Soft delete support
  deleted_at?: string | null;
  deletion_reason?: 'user_deleted' | 'not_needed';

  // Publication status
  status?: 'draft' | 'published';

  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Navigation link definition
 */
export interface NavigationLink {
  id?: string;
  text: string;
  target_topic_id?: string;
  target_foundation_page_id?: string;
  external_url?: string;
  prominence: 'high' | 'medium' | 'low';
  order?: number;
}

/**
 * Footer section with heading
 */
export interface FooterSection {
  id?: string;
  heading: string;  // Will use H4/H5
  links: NavigationLink[];
}

/**
 * Navigation structure for header and footer
 */
export interface NavigationStructure {
  id: string;
  map_id: string;

  // Header configuration
  header: {
    logo_alt_text: string;
    primary_nav: NavigationLink[];
    cta_button?: {
      text: string;
      target_topic_id?: string;
      target_foundation_page_id?: string;
      url?: string;
    };
  };

  // Footer configuration
  footer: {
    sections: FooterSection[];
    legal_links: NavigationLink[];  // Privacy, Terms
    nap_display: boolean;
    copyright_text: string;
  };

  // Boilerplate rules
  max_header_links: number;  // Default: 10
  max_footer_links: number;  // Default: 30
  dynamic_by_section: boolean;  // Change nav based on topic_class

  // Sticky header behavior
  sticky?: boolean;

  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Navigation sync status - tracks changes between topical map and navigation
 */
export interface NavigationSyncStatus {
  map_id: string;
  lastSyncedAt: string;
  topicsModifiedSince: number;  // Count of changes since last sync
  requiresReview: boolean;
  pendingChanges: {
    addedTopics: string[];
    deletedTopics: string[];
    renamedTopics: { id: string; oldTitle: string; newTitle: string }[];
  };
}

// ============================================================================
// FOUNDATION PAGE GENERATION
// ============================================================================

/**
 * Foundation page generation result
 */
export interface FoundationPageGenerationResult {
  foundationPages: Omit<FoundationPage, 'id' | 'map_id' | 'user_id' | 'created_at'>[];
  napSuggestion: NAPData;
}

/**
 * Non-blocking notification for foundation pages
 */
export interface FoundationNotification {
  id: string;
  type: 'info' | 'warning';  // Never 'error' for missing pages
  message: string;
  dismissable: boolean;
  showOnce: boolean;
  dismissed?: boolean;
  dismissedAt?: string;
  action?: {
    label: string;
    actionType: 'add_page' | 'configure_nav' | 'run_audit';
    targetPageType?: FoundationPageType;
  };
}

// ============================================================================
// SITEMAP TYPES
// ============================================================================

/**
 * Sitemap node for hierarchical view
 */
export interface SitemapNode {
  id: string;
  type: 'foundation' | 'core' | 'outer';
  title: string;
  slug: string;
  children?: SitemapNode[];
}

// Forward declaration for EnrichedTopic to avoid circular dependency
interface EnrichedTopicRef {
  id: string;
  title: string;
  slug: string;
}

/**
 * Computed sitemap view (not stored, generated from topics + foundation pages)
 */
export interface SitemapView {
  foundationPages: FoundationPage[];
  coreTopics: EnrichedTopicRef[];
  outerTopics: EnrichedTopicRef[];
  totalUrls: number;
  hierarchicalView: SitemapNode[];
}

// ============================================================================
// INTERNAL LINKING RULES
// ============================================================================

/**
 * Internal linking rules configuration
 */
export interface InternalLinkingRules {
  maxLinksPerPage: number;           // Default: 150
  maxAnchorRepetitionPerTarget: number; // Default: 3
  maxAnchorTextRepetition?: number;  // Max repetition of same anchor text across pages
  prioritizeMainContentLinks?: boolean; // Prioritize links within main content
  useDescriptiveAnchorText?: boolean;  // Prefer descriptive anchor text
  requireAnnotationText: boolean;    // Require context around anchors
  forbidFirstSentenceLinks: boolean; // Links before entity defined
  genericAnchorsToAvoid: string[];   // "click here", "read more", etc.
  qualityNodeThreshold: number;      // Score threshold (0-100)
}

/**
 * Default internal linking rules
 */
export const DEFAULT_INTERNAL_LINKING_RULES: InternalLinkingRules = {
  maxLinksPerPage: 150,
  maxAnchorRepetitionPerTarget: 3,
  requireAnnotationText: true,
  forbidFirstSentenceLinks: true,
  genericAnchorsToAvoid: ['click here', 'read more', 'learn more', 'this article', 'here'],
  qualityNodeThreshold: 70
};

// ============================================================================
// IMPORTS FOR LinkingAuditContext
// ============================================================================

import type { EnrichedTopic, ContentBrief } from './content';
import type { SEOPillars } from './business';

// Type aliases for backward compatibility
type EnrichedTopicFull = EnrichedTopic;
type ContentBriefRef = ContentBrief;
type SEOPillarsRef = SEOPillars;

// ============================================================================
// TABLE OF CONTENTS TYPES
// ============================================================================

/**
 * TOC Entry for Table of Contents generation
 */
export interface TOCEntry {
  id: string;
  heading: string;
  level: number;
  slug: string;           // URL-safe #hash
  children: TOCEntry[];
}

/**
 * Generated Table of Contents result
 */
export interface GeneratedTOC {
  entries: TOCEntry[];
  htmlOutput: string;
  markdownOutput: string;
  passageHints: string[];
  totalHeadings: number;
  maxDepth: number;
}

// ============================================================================
// HREFLANG TYPES
// ============================================================================

/**
 * Hreflang entry for multilingual support
 */
export interface HreflangEntry {
  language: string;       // ISO 639-1 (e.g., 'en', 'nl', 'de')
  region?: string;        // ISO 3166-1 Alpha-2 (e.g., 'US', 'NL')
  url: string;
  isDefault?: boolean;
}

/**
 * Hreflang configuration for international SEO
 */
export interface HreflangConfig {
  enabled: boolean;
  entries: HreflangEntry[];
  defaultLanguage: string;
  validateSymmetry: boolean;
}

/**
 * Hreflang validation result
 */
export interface HreflangValidationResult {
  isValid: boolean;
  symmetryIssues: { sourceUrl: string; missingReturnLinks: string[] }[];
  duplicateIssues: string[];
  formatIssues: string[];
  suggestions: string[];
  score: number;
}

// ============================================================================
// NAVIGATION ENHANCEMENT TYPES
// ============================================================================

/**
 * DOM size estimation for navigation elements
 * Used for Cost of Retrieval optimization
 */
export interface NavigationDOMEstimate {
  estimatedNodes: number;
  breakdown: {
    headerNav: number;
    footerSections: number;
    legalLinks: number;
    napData: number;
    wrappers: number;
  };
  corScore: number;    // Cost of Retrieval (0-100, lower is better)
  status: 'optimal' | 'warning' | 'critical';
  recommendations: string[];
}

/**
 * N-gram analysis for navigation entity reinforcement
 */
export interface NavigationNGramAnalysis {
  linksWithCentralEntity: NavigationLink[];
  linksWithoutCentralEntity: NavigationLink[];
  entityReinforcement: number; // 0-100 score
  centralEntityWords: string[];
  suggestions: string[];
}

/**
 * Anchor text repetition analysis result
 */
export interface AnchorRepetitionResult {
  violations: {
    targetId: string;
    targetTitle: string;
    anchor: string;
    count: number;
    sources: string[];
    riskLevel: 'warning' | 'critical';
  }[];
  diversificationSuggestions: {
    currentAnchor: string;
    targetTitle: string;
    alternatives: string[];
  }[];
  overallScore: number;
  summary: string;
}

/**
 * Link bridge analysis for contextual navigation
 */
export interface LinkBridgeAnalysis {
  linkId: string;
  targetTopicId?: string;
  targetTitle: string;
  needsBridge: boolean;
  relevanceScore: number;
  suggestedBridge?: string;
  reasons: string[];
}

// ============================================================================
// LINKING AUDIT CONTEXT
// ============================================================================

/**
 * Input context for linking audit passes
 */
export interface LinkingAuditContext {
  mapId: string;
  topics: EnrichedTopicFull[];
  briefs: Record<string, ContentBriefRef>;
  foundationPages: FoundationPage[];
  navigation: NavigationStructure | null;
  pillars: SEOPillarsRef;
  rules: InternalLinkingRules;
  domain?: string;           // For competitor link detection
  competitors?: string[];    // Competitor domains from topical map
}
