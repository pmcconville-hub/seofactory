/**
 * Competitive Intelligence Types Module
 *
 * Contains types for the Topic-Level Competitive Intelligence system:
 * - Content Layer Analysis (EAV classification, Central Entity consistency)
 * - Technical Layer Analysis (Schema, Navigation)
 * - Link Layer Analysis (PageRank flow, Anchor quality, Bridge justification)
 * - Gap Analysis (Attribute gaps, Technical gaps, Link gaps)
 *
 * Created: December 25, 2024
 *
 * @module types/competitiveIntelligence
 */

import { SemanticTriple, AttributeCategory } from './semantic';

// =============================================================================
// ATTRIBUTE RARITY CLASSIFICATION
// =============================================================================

/**
 * Attribute rarity based on competitor frequency
 * - root: 70%+ competitors (definitional, expected)
 * - rare: 20-69% competitors (authority signal)
 * - unique: <20% competitors (differentiation)
 */
export type AttributeRarity = 'root' | 'rare' | 'unique' | 'unknown';

/**
 * Rarity source tracking
 */
export interface RaritySource {
  method: 'competitor_frequency' | 'wikidata_check' | 'ai_inference';
  competitorCoverage?: number;  // % of top 10 that have this attribute
  confidence: number;           // 0-1
}

/**
 * Extended SemanticTriple with rarity classification
 */
export interface ClassifiedSemanticTriple extends SemanticTriple {
  attributeRarity?: AttributeRarity;
  raritySource?: RaritySource;
}

// =============================================================================
// ATTRIBUTE DISTRIBUTION
// =============================================================================

/**
 * Attribute distribution summary for a page/content
 */
export interface AttributeDistribution {
  root: number;      // Count of root attributes covered
  rare: number;      // Count of rare attributes covered
  unique: number;    // Count of unique attributes covered
  total: number;

  // Comparison to competitors
  rootCoverage: number;    // % of market root attributes covered
  rareCoverage: number;    // % of market rare attributes covered
  uniqueAdvantage: string[]; // Unique attributes only this competitor has
}

/**
 * Attribute gap analysis
 */
export interface AttributeGapAnalysis {
  missingRoot: {
    attribute: string;
    competitorsCovering: number;
    priority: 'critical';
    example: string;
  }[];

  missingRare: {
    attribute: string;
    competitorsCovering: number;
    priority: 'high';
    example: string;
  }[];

  uniqueOpportunities: {
    attribute: string;
    noCompetitorHas: boolean;
    potentialValue: string;
    priority: 'medium';
  }[];
}

// =============================================================================
// CENTRAL ENTITY ANALYSIS
// =============================================================================

/**
 * Detection source for central entity
 */
export type EntityDetectionSource = 'h1' | 'title' | 'schema' | 'frequency';

/**
 * Detected central entity
 */
export interface DetectedEntity {
  name: string;
  confidence: number;
  sources: EntityDetectionSource[];
}

/**
 * Heading presence analysis
 */
export interface HeadingPresence {
  h2Count: number;
  h2WithEntity: number;
  h3Count: number;
  h3WithEntity: number;
  ratio: number;
}

/**
 * Body distribution analysis
 */
export interface BodyPresence {
  totalParagraphs: number;
  paragraphsWithEntity: number;
  ratio: number;
  presentInFirstThird: boolean;
  presentInMiddleThird: boolean;
  presentInLastThird: boolean;
  distributionScore: number;
}

/**
 * N-gram analysis for entity mentions
 */
export interface EntityNGrams {
  exactMatch: number;
  partialMatch: number;
  synonymMatch: number;
}

/**
 * Contextual drift point
 */
export interface ContextualDriftPoint {
  position: number;
  driftedTo: string;
  severity: 'minor' | 'major';
}

/**
 * Contextual vector analysis
 */
export interface ContextualVector {
  isConsistent: boolean;
  driftPoints: ContextualDriftPoint[];
  vectorScore: number;
}

/**
 * Central entity consistency analysis
 */
export interface CentralEntityAnalysis {
  detectedEntity: DetectedEntity;

  consistency: {
    inH1: boolean;
    inTitle: boolean;
    inIntroduction: boolean;
    inSchema: boolean;
    headingPresence: HeadingPresence;
    bodyPresence: BodyPresence;
    entityNGrams: EntityNGrams;
  };

  contextualVector: ContextualVector;
  consistencyScore: number;

  issues: {
    issue: 'missing_in_h1' | 'missing_in_intro' | 'low_heading_presence' |
           'uneven_distribution' | 'contextual_drift';
    severity: 'critical' | 'warning' | 'info';
    description: string;
    location: string;
  }[];
}

// =============================================================================
// CONTENT LAYER ANALYSIS
// =============================================================================

/**
 * Complete content layer analysis for a page
 */
export interface ContentLayerAnalysis {
  url: string;
  domain: string;
  analyzedAt: Date;

  // EAV triples with classification
  eavTriples: ClassifiedSemanticTriple[];

  // Attribute distribution
  attributeDistribution: AttributeDistribution;

  // Central entity analysis
  centralEntityAnalysis: CentralEntityAnalysis;

  // Overall content score
  contentScore: number;

  // Content metrics (NEW - actual data)
  wordCount?: number;           // Actual word count from content
  headingCount?: number;        // Number of headings
  imageCount?: number;          // Number of images
  schemaTypesFound?: string[];  // Schema types found on page
}

// =============================================================================
// SCHEMA ENTITY LINKING
// =============================================================================

/**
 * Entity in schema markup
 */
export interface SchemaEntity {
  name: string;
  type: string;
  wikidataId: string | null;
  wikipediaUrl: string | null;
  isProperlyReconciled: boolean;
}

/**
 * About property analysis
 */
export interface AboutAnalysis {
  present: boolean;
  entities: SchemaEntity[];
  quality: 'excellent' | 'good' | 'poor' | 'missing';
  issues: string[];
}

/**
 * Mentions property analysis
 */
export interface MentionsAnalysis {
  present: boolean;
  count: number;
  entities: SchemaEntity[];
  quality: 'excellent' | 'good' | 'poor' | 'missing';
}

/**
 * Schema entity linking analysis
 */
export interface EntityLinkingAnalysis {
  about: AboutAnalysis;
  mentions: MentionsAnalysis;
  disambiguationScore: number;
  recommendations: {
    action: string;
    impact: 'high' | 'medium' | 'low';
    implementation: string;
  }[];
}

// =============================================================================
// NAVIGATION ANALYSIS
// =============================================================================

/**
 * Navigation element analysis
 */
export interface NavigationElementAnalysis {
  linkCount: number;
  isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';
  dynamicSignals: string[];
  staticSignals: string[];
}

/**
 * Header navigation analysis
 */
export interface HeaderAnalysis extends NavigationElementAnalysis {
  isMegaMenu: boolean;
  megaMenuCategories: number;
}

/**
 * Footer navigation analysis
 */
export interface FooterAnalysis extends NavigationElementAnalysis {
  hasCorporateLinks: {
    aboutUs: boolean;
    privacyPolicy: boolean;
    termsOfService: boolean;
    contact: boolean;
  };
}

/**
 * Sidebar analysis
 */
export interface SidebarAnalysis {
  present: boolean;
  linkCount: number;
  isDynamic: 'likely_dynamic' | 'likely_static' | 'unknown';
  linksRelevantToPage: number;
  relevanceScore: number;
}

/**
 * Navigation issue
 */
export interface NavigationIssue {
  issue: 'mega_menu_dilution' | 'static_footer' | 'irrelevant_sidebar' | 'missing_corporate';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  recommendation: string;
}

/**
 * Complete navigation analysis
 */
export interface NavigationAnalysis {
  header: HeaderAnalysis;
  footer: FooterAnalysis;
  sidebar: SidebarAnalysis;
  navigationScore: number;
  issues: NavigationIssue[];
}

// =============================================================================
// TECHNICAL LAYER ANALYSIS
// =============================================================================

/**
 * Complete technical layer analysis
 */
export interface TechnicalLayerAnalysis {
  url: string;
  domain: string;
  analyzedAt: Date;

  // Schema analysis
  schema: {
    hasSchema: boolean;
    schemaTypes: string[];
    entityLinking: EntityLinkingAnalysis;
    validationErrors: string[];
  };

  // Navigation analysis
  navigationAnalysis: NavigationAnalysis;

  // HTML semantic tags
  semanticTags: {
    hasArticle: boolean;
    hasMain: boolean;
    hasAside: boolean;
    hasNav: boolean;
    hasHeader: boolean;
    hasFooter: boolean;
  };

  // Overall technical score
  technicalScore: number;
}

// =============================================================================
// LINK POSITION ANALYSIS
// =============================================================================

/**
 * Link position in content
 */
export interface LinkPosition {
  contentZone: 'early' | 'middle' | 'late';
  percentageThrough: number;
  paragraphNumber: number;
  totalParagraphs: number;
  contentType: 'main' | 'supplementary' | 'navigation';
  isOptimalPlacement: boolean;
  placementScore: number;
}

/**
 * Internal link with position
 */
export interface InternalLink {
  href: string;
  anchorText: string;
  context: string;
  placement: 'in-content' | 'sidebar' | 'footer' | 'nav' | 'related-posts';
  followStatus: 'follow' | 'nofollow';
  isImage: boolean;
  position: LinkPosition;
}

// =============================================================================
// ANCHOR TEXT QUALITY
// =============================================================================

/**
 * Anchor text repetition issue
 */
export interface AnchorRepetitionIssue {
  anchorText: string;
  count: number;
  targetUrl: string;
  isViolation: boolean;
}

/**
 * Generic anchor issue
 */
export interface GenericAnchorIssue {
  anchorText: string;
  href: string;
  suggestion: string;
}

/**
 * First-word link issue
 */
export interface FirstWordLinkIssue {
  anchorText: string;
  href: string;
  paragraphStart: string;
}

/**
 * Anchor text quality analysis
 */
export interface AnchorTextQuality {
  repetitionIssues: AnchorRepetitionIssue[];
  genericAnchors: GenericAnchorIssue[];
  genericCount: number;
  firstWordLinks: FirstWordLinkIssue[];
  firstWordCount: number;

  scores: {
    repetition: number;
    descriptiveness: number;
    placement: number;
    annotation: number;
    overall: number;
  };

  issues: {
    severity: 'critical' | 'warning' | 'info';
    type: 'repetition' | 'generic' | 'placement' | 'annotation';
    description: string;
    count: number;
  }[];
}

// =============================================================================
// PAGERANK FLOW ANALYSIS
// =============================================================================

/**
 * Page type classification
 */
export type PageType = 'core' | 'author' | 'bridge' | 'unknown';

/**
 * Flow direction classification
 */
export type FlowDirection = 'correct' | 'reversed' | 'balanced' | 'unclear';

/**
 * Flow issue
 */
export interface FlowIssue {
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  affectedLinks: string[];
}

/**
 * Links to section analysis
 */
export interface SectionLinks {
  count: number;
  urls: string[];
  anchorTexts: string[];
  placement: ('early' | 'middle' | 'late')[];
}

/**
 * PageRank flow analysis
 */
export interface PageRankFlowAnalysis {
  pageType: PageType;
  pageTypeConfidence: number;
  pageTypeSignals: string[];

  flowAnalysis: {
    linksToCore: SectionLinks;
    linksToAuthor: SectionLinks;
    flowDirection: FlowDirection;
    flowScore: number;
    issues: FlowIssue[];
  };

  strategicAssessment: {
    isOptimal: boolean;
    recommendation: string;
    potentialImprovement: string;
  };
}

// =============================================================================
// BRIDGE JUSTIFICATION ANALYSIS
// =============================================================================

/**
 * Bridge justification issue
 */
export interface BridgeJustificationIssue {
  issue: 'no_context' | 'abrupt_transition' | 'semantic_disconnect' | 'early_placement';
  description: string;
  suggestion: string;
}

/**
 * Bridge topic justification
 */
export interface BridgeJustification {
  hasSubordinateText: boolean;
  subordinateHeading: string | null;
  hasContextualIntro: boolean;
  contextualText: string | null;
  linkPlacement: 'inline' | 'section_end' | 'standalone';
  isJustified: boolean;
  justificationScore: number;
  issues: BridgeJustificationIssue[];
}

/**
 * Bridge topic with justification
 */
export interface BridgeTopic {
  topic: string;
  function: 'connects' | 'supports' | 'expands';
  connectsClusters: string[];
  linkJuiceFlow: 'inbound' | 'outbound' | 'bidirectional';
  strategicValue: 'high' | 'medium' | 'low';
  justification: BridgeJustification;
}

// =============================================================================
// LINK LAYER ANALYSIS
// =============================================================================

/**
 * Placement patterns summary
 */
export interface PlacementPatterns {
  coreLinksPlacements: {
    early: number;
    middle: number;
    late: number;
    optimal: number;
  };
  authorLinksPlacements: {
    early: number;
    middle: number;
    late: number;
  };
  overallPlacementScore: number;
  recommendations: {
    action: string;
    currentPlacement: string;
    suggestedPlacement: string;
    affectedLinks: string[];
  }[];
}

/**
 * Complete link layer analysis
 */
export interface LinkLayerAnalysis {
  url: string;
  domain: string;
  analyzedAt: Date;

  // Internal links
  internal: {
    links: InternalLink[];
    totalCount: number;
    uniqueTargets: number;
    anchorTextQuality: AnchorTextQuality;
  };

  // External links
  external: {
    links: { href: string; anchorText: string; nofollow: boolean }[];
    totalCount: number;
  };

  // PageRank flow
  pageRankFlow: PageRankFlowAnalysis;

  // Bridge topics
  bridgeTopics: BridgeTopic[];

  // Placement patterns
  placementPatterns: PlacementPatterns;

  // Overall link score
  linkScore: number;
}

// =============================================================================
// COMPETITOR ANALYSIS
// =============================================================================

/**
 * Single competitor analysis result
 */
export interface CompetitorAnalysis {
  url: string;
  domain: string;
  position: number;
  analyzedAt: Date;

  content: ContentLayerAnalysis;
  technical: TechnicalLayerAnalysis;
  links: LinkLayerAnalysis;

  overallScore: number;
  strengths: string[];
  weaknesses: string[];
}

// =============================================================================
// GAP ANALYSIS
// =============================================================================

/**
 * Comprehensive gap analysis
 */
export interface ComprehensiveGapAnalysis {
  // Attribute gaps
  attributes: AttributeGapAnalysis;

  // Technical gaps
  technical: {
    missingSchemaTypes: string[];
    entityLinkingGap: boolean;
    navigationIssues: string[];
  };

  // Link gaps
  links: {
    flowIssues: string[];
    anchorQualityIssues: string[];
    bridgeOpportunities: string[];
  };

  // Priority actions
  priorityActions: {
    action: string;
    category: 'content' | 'technical' | 'links';
    priority: 'critical' | 'high' | 'medium' | 'low';
    expectedImpact: string;
  }[];
}

// =============================================================================
// TOPIC SERP INTELLIGENCE
// =============================================================================

/**
 * Complete SERP intelligence for a topic
 */
export interface TopicSerpIntelligence {
  topic: string;
  analyzedAt: Date;
  mode: 'fast' | 'deep';

  // SERP snapshot
  serp: {
    totalResults: number;
    features: string[];
    topCompetitors: {
      position: number;
      url: string;
      domain: string;
      title: string;
    }[];
  };

  // Competitor analyses
  competitors: CompetitorAnalysis[];

  // Aggregated patterns
  patterns: {
    dominantContentType: string;
    avgWordCount: number;
    commonSchemaTypes: string[];
    topAttributes: { attribute: string; coverage: number }[];
  };

  // Gap analysis (compared to competitors)
  gaps: ComprehensiveGapAnalysis;

  // Overall scores
  scores: {
    contentOpportunity: number;
    technicalOpportunity: number;
    linkOpportunity: number;
    overallDifficulty: number;
  };
}

// =============================================================================
// COMPREHENSIVE COMPETITOR EXTRACTION (Phase 1)
// =============================================================================

/**
 * Analysis depth configuration
 */
export type AnalysisDepth = 'quick' | 'standard' | 'thorough';

export const DEPTH_CONFIG: Record<AnalysisDepth, { competitors: number; label: string }> = {
  quick: { competitors: 3, label: 'Quick (3 competitors)' },
  standard: { competitors: 5, label: 'Standard (5 competitors)' },
  thorough: { competitors: 10, label: 'Thorough (10 competitors)' }
};

/**
 * Fetch status tracking with provider info
 */
export interface FetchStatus {
  htmlSuccess: boolean;
  markdownSuccess: boolean;
  provider: 'jina' | 'firecrawl' | 'direct' | 'failed';
  warnings: string[];
  fetchedAt: Date;
  responseTimeMs?: number;
}

/**
 * Content metrics from actual extraction
 */
export interface ContentMetrics {
  wordCount: number;
  wordCountSource: 'html' | 'markdown' | 'estimated';
  paragraphCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  readingLevel: string;        // Flesch-Kincaid grade level
  audienceLevel: 'beginner' | 'intermediate' | 'expert' | 'mixed';
}

/**
 * Content structure analysis
 */
export interface ContentStructure {
  title: string;
  h1: string;
  headings: { level: number; text: string }[];
  h2Count: number;
  h3Count: number;
  headingPattern: 'question-based' | 'how-to' | 'numbered-list' | 'descriptive' | 'mixed';
  hasTableOfContents: boolean;
  hasFaq: boolean;
  contentTemplate: 'guide' | 'listicle' | 'comparison' | 'product' | 'how-to' | 'faq' | 'news' | 'review' | 'unknown';
}

/**
 * Image inventory item
 */
export interface ImageInventoryItem {
  src: string;
  alt: string;
  title?: string;
  type: 'hero' | 'diagram' | 'photo' | 'infographic' | 'chart' | 'screenshot' | 'icon' | 'unknown';
  position: 'hero' | 'inline' | 'sidebar' | 'footer';
  hasAlt: boolean;
  width?: number;
  height?: number;
}

/**
 * Visual content analysis
 */
export interface VisualAnalysis {
  imageCount: number;
  imageCountSource: 'html' | 'markdown' | 'estimated';
  images: ImageInventoryItem[];
  heroImage?: ImageInventoryItem;
  hasVideo: boolean;
  videoSources: string[];
  tableCount: number;
  listCount: number;
  altTextQuality: {
    score: number;
    withAlt: number;
    withoutAlt: number;
    descriptive: number;
    keywordStuffed: number;
  };
}

/**
 * Technical SEO analysis
 */
export interface TechnicalSeoAnalysis {
  schemaTypes: string[];
  schemaSource: 'json-ld' | 'microdata' | 'rdfa' | 'inferred' | 'none';
  schemaEntities: {
    name: string;
    type: string;
    wikidataId?: string;
  }[];
  hasAboutMentions: boolean;
  hasBreadcrumbs: boolean;
  breadcrumbStructure?: string[];
  semanticTags: string[];
  metaTags: {
    title?: string;
    description?: string;
    canonical?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
}

/**
 * Semantic content analysis
 */
export interface SemanticAnalysis {
  eavTriples: ClassifiedSemanticTriple[];
  eavSource: 'ai-extracted' | 'heading-proxy' | 'none';
  topicsDiscussed: string[];
  uniqueAngles: string[];
  keyPhrases: string[];
}

/**
 * Link summary (simplified for extraction)
 */
export interface LinkSummary {
  internalCount: number;
  externalCount: number;
  authorityLinks: string[];    // .edu, .gov, Wikipedia
  noFollowCount: number;
}

/**
 * Comprehensive extraction result for a single competitor
 */
export interface ComprehensiveExtraction {
  url: string;
  domain: string;
  position?: number;           // SERP position if known
  fetchedAt: Date;

  // Fetch status with fallback tracking
  fetchStatus: FetchStatus;

  // Content metrics
  content: ContentMetrics;

  // Structure analysis
  structure: ContentStructure;

  // Visual analysis
  visuals: VisualAnalysis;

  // Technical SEO
  technical: TechnicalSeoAnalysis;

  // Semantic analysis
  semantic: SemanticAnalysis;

  // Link summary
  links: LinkSummary;

  // Raw content (for debugging/further processing)
  raw?: {
    html?: string;
    markdown?: string;
  };
}

/**
 * Failed extraction result (for graceful degradation)
 */
export interface FailedExtraction {
  url: string;
  domain: string;
  fetchedAt: Date;
  fetchStatus: FetchStatus;
  error: string;
}

/**
 * Extraction result union type
 */
export type ExtractionResult = ComprehensiveExtraction | FailedExtraction;

/**
 * Type guard for successful extraction
 */
export function isSuccessfulExtraction(result: ExtractionResult): result is ComprehensiveExtraction {
  return result.fetchStatus.htmlSuccess || result.fetchStatus.markdownSuccess;
}

// =============================================================================
// MARKET PATTERNS (Phase 2)
// =============================================================================

/**
 * Content benchmarks from market analysis
 */
export interface ContentBenchmarks {
  avgWordCount: number;
  wordCountRange: { min: number; max: number };
  recommendedWordCount: number;
  wordCountConfidence: 'high' | 'medium' | 'low';

  avgParagraphs: number;
  avgHeadings: number;
  avgSentenceLength: number;
  audienceLevelDistribution: Record<string, number>;
  dominantAudienceLevel: string;
}

/**
 * Structure benchmarks from market analysis
 */
export interface StructureBenchmarks {
  commonHeadingPatterns: string[];
  avgH2Count: number;
  avgH3Count: number;
  hasTocPercentage: number;
  hasFaqPercentage: number;
  dominantContentTemplate: string;
}

/**
 * Visual benchmarks from market analysis
 */
export interface VisualBenchmarks {
  avgImageCount: number;
  imageCountRange: { min: number; max: number };
  recommendedImageCount: number;
  hasVideoPercentage: number;
  avgTableCount: number;
  commonImageTypes: string[];
}

/**
 * Technical benchmarks from market analysis
 */
export interface TechnicalBenchmarks {
  commonSchemaTypes: string[];
  schemaPresencePercentage: number;
  hasAboutMentionsPercentage: number;
  recommendedSchemaTypes: string[];
}

/**
 * Semantic benchmarks from market analysis
 */
export interface SemanticBenchmarks {
  rootAttributes: { attribute: string; coverage: number }[];
  rareAttributes: { attribute: string; coverage: number }[];
  uniqueOpportunities: string[];
  requiredTopics: string[];
  differentiationTopics: string[];
}

/**
 * Market patterns aggregated from competitor analysis
 */
export interface MarketPatterns {
  // Sample info
  competitorsAnalyzed: number;
  competitorsFailed: number;
  totalRequested: number;
  dataQuality: 'high' | 'medium' | 'low' | 'none';
  analyzedAt: Date;
  warnings: string[];

  // Benchmarks by category
  content: ContentBenchmarks;
  structure: StructureBenchmarks;
  visuals: VisualBenchmarks;
  technical: TechnicalBenchmarks;
  semantic: SemanticBenchmarks;
}

/**
 * Default market patterns (fallback when no data available)
 */
export function createDefaultMarketPatterns(warnings: string[]): MarketPatterns {
  return {
    competitorsAnalyzed: 0,
    competitorsFailed: 0,
    totalRequested: 0,
    dataQuality: 'none',
    analyzedAt: new Date(),
    warnings: [...warnings, 'Using default values - no competitor data available'],

    content: {
      avgWordCount: 1500,
      wordCountRange: { min: 1000, max: 2500 },
      recommendedWordCount: 1500,
      wordCountConfidence: 'low',
      avgParagraphs: 20,
      avgHeadings: 8,
      avgSentenceLength: 18,
      audienceLevelDistribution: {},
      dominantAudienceLevel: 'intermediate',
    },

    structure: {
      commonHeadingPatterns: [],
      avgH2Count: 6,
      avgH3Count: 8,
      hasTocPercentage: 0,
      hasFaqPercentage: 0,
      dominantContentTemplate: 'guide',
    },

    visuals: {
      avgImageCount: 5,
      imageCountRange: { min: 3, max: 10 },
      recommendedImageCount: 5,
      hasVideoPercentage: 0,
      avgTableCount: 1,
      commonImageTypes: [],
    },

    technical: {
      commonSchemaTypes: ['Article'],
      schemaPresencePercentage: 0,
      hasAboutMentionsPercentage: 0,
      recommendedSchemaTypes: ['Article'],
    },

    semantic: {
      rootAttributes: [],
      rareAttributes: [],
      uniqueOpportunities: [],
      requiredTopics: [],
      differentiationTopics: [],
    },
  };
}

// =============================================================================
// ANALYSIS WARNING SYSTEM
// =============================================================================

/**
 * Analysis warning for user notification
 */
export interface AnalysisWarning {
  url?: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  fallbackUsed?: string;
  timestamp: Date;
}

/**
 * Analysis status for progress tracking
 */
export interface AnalysisStatus {
  stage: 'idle' | 'fetching-serp' | 'analyzing-competitors' | 'aggregating' | 'complete' | 'error';
  progress: number;
  currentUrl?: string;
  competitorsTotal: number;
  competitorsSuccess: number;
  competitorsFailed: number;
  warnings: AnalysisWarning[];
  startedAt?: Date;
  completedAt?: Date;
}

// =============================================================================
// QUERY NETWORK AUDIT TYPES
// For LLM-driven competitive analysis and content gap identification
// =============================================================================

/**
 * Query intent classification for SERP analysis
 */
export type QueryIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';

/**
 * A query within the network with metadata
 */
export interface QueryNetworkNode {
  query: string;
  intent: QueryIntent;
  searchVolume?: number;
  difficulty?: number;
  relatedQueries: string[];
  questions: string[];
}

/**
 * SERP competitor data for a single query
 */
export interface SerpCompetitorData {
  url: string;
  title: string;
  position: number;
  domain: string;
  wordCount?: number;
  headings?: { level: number; text: string }[];
  featuredSnippet?: boolean;
}

/**
 * EAV (Entity-Attribute-Value) extracted from competitor content
 */
export interface CompetitorEAV {
  entity: string;
  attribute: string;
  value: string;
  source: string; // URL where this was found
  confidence: number;
  category?: AttributeCategory;
}

/**
 * Information density metrics for a piece of content
 */
export interface InformationDensityScore {
  factsPerSentence: number;
  uniqueEntitiesCount: number;
  uniqueAttributesCount: number;
  totalEAVs: number;
  densityScore: number; // 0-100
  benchmark?: number; // Industry/competitor average
}

/**
 * Content gap identified through competitive analysis
 */
export interface ContentGap {
  missingAttribute: string;
  foundInCompetitors: string[]; // URLs where this attribute exists
  frequency: number; // How many competitors cover this
  priority: 'high' | 'medium' | 'low';
  suggestedContent?: string;
}

// =============================================================================
// GAP NETWORK VISUALIZATION TYPES
// =============================================================================

/**
 * Node types for competitor gap network visualization
 */
export type GapNodeType = 'your_eav' | 'gap' | 'competitor_eav';

/**
 * Node in the competitor gap network graph
 * Represents either your EAVs (coverage) or gaps (missing content)
 */
export interface GapNode {
  id: string;
  type: GapNodeType;

  // For your_eav and competitor_eav
  entity?: string;
  attribute?: string;
  value?: string;

  // For gap nodes
  missingAttribute?: string;
  suggestedContent?: string;

  // Competitor coverage info
  competitorCount: number;        // How many competitors cover this
  competitorUrls: string[];       // Which competitor URLs have this

  // Visual properties
  label: string;                  // Display label
  priority: 'high' | 'medium' | 'low';

  // Physics simulation (populated during render)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;

  // Metrics
  semanticDistance?: number;      // Distance from central entity (0-1)
  relatedTopicIds?: string[];     // Topics that could address this gap
}

/**
 * Edge types for competitor gap network visualization
 */
export type GapEdgeType = 'semantic' | 'hierarchical' | 'suggested_bridge';

/**
 * Edge connecting nodes in the competitor gap network
 */
export interface GapEdge {
  id: string;
  source: string;                 // Source node ID
  target: string;                 // Target node ID
  type: GapEdgeType;

  // Semantic relationship strength (0-1, lower = more related)
  semanticDistance: number;

  // For suggested_bridge edges
  bridgeReason?: string;          // Why this connection is suggested

  // Visual weight for rendering
  weight: number;                 // 1-10, affects line thickness
}

/**
 * Complete competitor gap network data for visualization
 */
export interface CompetitorGapNetwork {
  nodes: GapNode[];
  edges: GapEdge[];

  // Aggregated metrics
  metrics: {
    totalGaps: number;
    highPriorityGaps: number;
    yourCoverage: number;         // Percentage of topics you cover (0-100)
    avgCompetitorCoverage: number; // Average competitor coverage count
    centralEntity: string;        // The focus entity
    competitors: string[];        // List of competitor domains analyzed
  };

  // Cluster information
  clusters?: {
    id: string;
    label: string;
    nodeIds: string[];
    centroidNodeId?: string;      // Most central node in cluster
  }[];
}

/**
 * Heading hierarchy analysis for a competitor page
 */
export interface HeadingHierarchy {
  url: string;
  headings: {
    level: number;
    text: string;
    wordCount: number;
  }[];
  hierarchyScore: number; // 0-100, how well-structured
  issues: string[];
}

/**
 * Complete Query Network analysis result
 */
export interface QueryNetworkAnalysisResult {
  seedKeyword: string;
  queryNetwork: QueryNetworkNode[];
  serpResults: Map<string, SerpCompetitorData[]>;
  competitorEAVs: CompetitorEAV[];
  ownContentEAVs?: CompetitorEAV[];
  contentGaps: ContentGap[];
  informationDensity: {
    own?: InformationDensityScore;
    competitorAverage: InformationDensityScore;
    topCompetitor: InformationDensityScore;
  };
  headingAnalysis: HeadingHierarchy[];
  recommendations: QueryNetworkRecommendationRef[];
  /** GSC-derived insights (quick wins, low CTR, etc.) */
  gscInsights?: GscInsight[];
  /** Whether real GSC data was used in this analysis */
  hasGscData?: boolean;
  /** Summary of crawled site inventory (when available from Discover step) */
  siteInventorySummary?: {
    totalPages: number;
    totalTopics: number;
    avgWordCount: number;
    pagesWithH1: number;
    topicsCovered: string[];
  };
  /** Google API enrichment data from pipeline gap analysis */
  googleApiEnrichment?: {
    urlInspection?: { indexed: number; blocked: number; errors: number; total: number };
    entitySalience?: { centralEntitySalience: number; rank: number; totalEntities: number };
    trends?: { peakMonths: number[]; seasonalityStrength: number };
    ga4?: { totalSessions: number; avgBounceRate: number; topPages: string[] };
    knowledgeGraph?: { found: boolean; authorityScore: number };
  };
  timestamp: string;
}

// =============================================================================
// ENTITY AUTHORITY TYPES
// =============================================================================

/**
 * Wikipedia entity verification result
 */
export interface WikipediaEntityResult {
  found: boolean;
  title?: string;
  extract?: string;
  pageUrl?: string;
  wikidataId?: string;
  categories?: string[];
  relatedEntities?: string[];
}

/**
 * Wikidata entity data
 */
export interface WikidataEntityResult {
  id: string;
  label: string;
  description?: string;
  aliases?: string[];
  claims?: Record<string, unknown>;
  sitelinks?: Record<string, string>;
}

/**
 * Google Knowledge Graph entity result
 */
export interface KnowledgeGraphEntityResult {
  id: string;
  name: string;
  type: string[];
  description?: string;
  detailedDescription?: {
    articleBody: string;
    url: string;
    license: string;
  };
  image?: {
    url: string;
    contentUrl: string;
  };
  url?: string;
  resultScore: number;
}

/**
 * Combined entity authority validation result
 */
export interface EntityAuthorityResult {
  entityName: string;
  wikipedia: WikipediaEntityResult | null;
  wikidata: WikidataEntityResult | null;
  knowledgeGraph: KnowledgeGraphEntityResult | null;
  authorityScore: number; // 0-100
  verificationStatus: 'verified' | 'partial' | 'unverified';
  recommendations: string[];
}

// =============================================================================
// GSC INSIGHT TYPES
// =============================================================================

/**
 * GSC-derived insight for gap analysis enrichment
 */
export interface GscInsight {
  type: 'quick_win' | 'low_ctr' | 'declining' | 'zero_clicks' | 'cannibalization';
  query: string;
  page?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  recommendation: string;
}

// =============================================================================
// MENTION SCANNER TYPES
// =============================================================================

/**
 * Reputation signal from external source
 */
export interface ReputationSignal {
  source: string;
  sourceType: 'review_platform' | 'news' | 'social' | 'industry' | 'government';
  sentiment: 'positive' | 'neutral' | 'negative';
  mentionCount: number;
  avgRating?: number;
  url?: string;
  lastUpdated?: string;
}

/**
 * Entity co-occurrence in content
 */
export interface EntityCoOccurrence {
  entity: string;
  frequency: number;
  contexts: string[];
  associationType: 'competitor' | 'partner' | 'industry_term' | 'related_brand';
}

/**
 * E-A-T (Expertise, Authority, Trust) breakdown
 */
export interface EATBreakdown {
  expertise: {
    score: number;
    signals: string[];
  };
  authority: {
    score: number;
    signals: string[];
  };
  trust: {
    score: number;
    signals: string[];
  };
}

/**
 * Mention Scanner configuration
 */
export interface MentionScannerConfig {
  entityName: string;
  domain?: string;
  industry?: string;
  language: string;
  includeReviews: boolean;
  includeSocialMentions: boolean;
  includeNewsArticles: boolean;
}

/**
 * Mention Scanner progress
 */
export interface MentionScannerProgress {
  phase: 'initializing' | 'verifying_identity' | 'scanning_reputation' | 'analyzing_cooccurrences' | 'calculating_score' | 'complete' | 'error';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  progress: number;
  error?: string;
}

/**
 * Complete Mention Scanner result
 */
export interface MentionScannerResult {
  entityName: string;
  domain?: string;
  timestamp: string;

  // Identity verification
  entityAuthority: EntityAuthorityResult;

  // Reputation signals
  reputationSignals: ReputationSignal[];
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';

  // Co-occurrences
  coOccurrences: EntityCoOccurrence[];
  topicalAssociations: string[];

  // E-A-T Analysis
  eatBreakdown: EATBreakdown;
  eatScore: number; // 0-100

  // Recommendations
  recommendations: MentionScannerRecommendation[];
}

/**
 * Mention Scanner recommendation
 */
export interface MentionScannerRecommendation {
  type: 'identity' | 'reputation' | 'authority' | 'trust' | 'visibility';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedAction: string;
  estimatedImpact: string;
}

// Forward declaration for QueryNetworkRecommendation (canonical in types/audit.ts)
interface QueryNetworkRecommendationRef {
  type: 'content_gap' | 'density_improvement' | 'structure_fix' | 'new_topic';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedQueries: string[];
  estimatedImpact: string;
  suggestedAction: string;
}
