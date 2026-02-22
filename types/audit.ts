/**
 * Audit Types Module
 *
 * Contains validation and audit types including:
 * - ValidationResult: Topic map validation results
 * - AuditRuleResult: Individual audit rule checks
 * - ContentIntegrityResult: Content quality audit
 * - LinkingAuditResult: Internal linking audit
 * - UnifiedAuditResult: Comprehensive unified audit
 * - PageAuditResult: Page-level SEO audit
 * - CorpusAuditResult: Site-wide corpus analysis
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/audit
 */

import { FreshnessProfile, SemanticTriple } from './semantic';
import type { FoundationPageType } from './navigation';

// ============================================================================
// FORWARD DECLARATIONS (to avoid circular dependencies)
// ============================================================================

// Forward declaration for EnrichedTopic (defined in content.ts)
export interface EnrichedTopicRef {
  id: string;
  title: string;
  type: 'core' | 'outer' | 'child';
}

// Forward declaration for ContentBrief (defined in content.ts)
export interface ContentBriefRef {
  id: string;
  topic_id: string;
  title: string;
}

// Forward declaration for FoundationPage (defined in main types.ts)
export interface FoundationPageRef {
  id: string;
  type: string;
}

// Forward declaration for NavigationStructure (defined in main types.ts)
export interface NavigationStructureRef {
  id: string;
}

// Forward declaration for SEOPillars (defined in business.ts)
export interface SEOPillarsRef {
  centralEntity?: string;
  sourceContext?: string;
  centralSearchIntent?: string;
}

// ============================================================================
// AUDIT SEVERITY AND BASE TYPES
// ============================================================================

/**
 * Audit rule severity levels
 */
export type AuditSeverity = 'critical' | 'warning' | 'suggestion';

/**
 * Validation violation from content rules
 */
export interface ValidationViolation {
  rule: string;
  text: string;
  position: number;
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Rules validation result
 */
export interface RulesValidationResult {
  passed: boolean;
  violations: ValidationViolation[];
  fixInstructions: string;
}

// ============================================================================
// VALIDATION TYPES (Topic Map Validation)
// ============================================================================

/**
 * Validation issue for topic map
 */
export interface ValidationIssue {
  rule: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  offendingTopics?: string[];
}

/**
 * Hub-spoke metric for validation
 */
export interface HubSpokeMetric {
  hubId: string;
  hubTitle: string;
  spokeCount: number;
  status: 'OPTIMAL' | 'UNDER_SUPPORTED' | 'DILUTED';
}

/**
 * Anchor text metric for validation
 */
export interface AnchorTextMetric {
  anchorText: string;
  count: number;
  isRepetitive: boolean;
}

/**
 * Freshness metric for validation
 */
export interface FreshnessMetric {
  topicId: string;
  title: string;
  freshness: FreshnessProfile;
  decayScore: number;
}

/**
 * Type misclassification detection
 */
export interface TypeMisclassification {
  topicTitle: string;
  currentType: 'core' | 'outer';
  shouldBe: 'core' | 'outer';
  reason: string;
  suggestedParent?: string;
}

/**
 * Topic classification result
 */
export interface TopicClassificationResult {
  id: string;
  topic_class: 'monetization' | 'informational';
  suggestedType?: 'core' | 'outer' | null;
  suggestedParentTitle?: string | null;
  typeChangeReason?: string | null;
}

// FoundationPageType is imported from './navigation'
// Re-export for convenience
export type { FoundationPageType } from './navigation';

/**
 * Full validation result for topic map
 */
export interface ValidationResult {
  overallScore: number;
  summary: string;
  issues: ValidationIssue[];
  typeMisclassifications?: TypeMisclassification[];
  metrics?: {
    hubSpoke: HubSpokeMetric[];
    anchorText: AnchorTextMetric[];
    contentFreshness: FreshnessMetric[];
  };
  foundationPageIssues?: {
    missingPages: FoundationPageType[];
    incompletePages: { pageType: FoundationPageType; missingFields: string[] }[];
    suggestions: string[];
  };
  navigationIssues?: {
    headerLinkCount: number;
    headerLinkLimit: number;
    footerLinkCount: number;
    footerLinkLimit: number;
    missingInHeader: string[];
    missingInFooter: string[];
    suggestions: string[];
  };
}

// ============================================================================
// INTERNAL LINK AUDIT TYPES
// ============================================================================

/**
 * Missed internal link suggestion
 */
export interface MissedLink {
  sourceTopic: string;
  targetTopic: string;
  suggestedAnchor: string;
  linkingPriority: 'high' | 'medium' | 'low';
}

/**
 * Link dilution risk
 */
export interface DilutionRisk {
  topic: string;
  issue: string;
}

/**
 * Internal link audit result
 */
export interface InternalLinkAuditResult {
  summary: string;
  missedLinks: MissedLink[];
  dilutionRisks: DilutionRisk[];
}

// ============================================================================
// CONTENT AUDIT TYPES
// ============================================================================

/**
 * Individual audit rule result
 */
export interface AuditRuleResult {
  ruleName: string;
  isPassing: boolean;
  details: string;
  remediation?: string;
  affectedTextSnippet?: string;
  score?: number; // Optional numeric score (0-100) for rules that provide granular quality metrics
}

/**
 * Semantic triple audit result
 */
export interface TripleAuditResult {
  tripleDensityScore: number;
  missingTriples: string[];
  sentenceStructureIssues: string[];
  consistencyIssues: string[];
}

/**
 * Content integrity result (article audit)
 */
export interface ContentIntegrityResult {
  overallSummary: string;
  draftText: string; // The text that was audited (needed for Auto-Fix)
  eavCheck: { isPassing: boolean; details: string };
  linkCheck: { isPassing: boolean; details: string };
  linguisticModality: { score: number; summary: string };
  frameworkRules: AuditRuleResult[];
  tripleAnalysis?: TripleAuditResult;
  // Computed fields for UI display
  overallScore?: number; // Computed 0-100 score
  algorithmicResults?: AuditRuleResult[]; // Alias for frameworkRules for backward compatibility
  // Brief-level audit fields (used by ContentBrief.contentAudit)
  sections?: Array<{
    key: string;
    heading: string;
    score: number;
    issues: string[];
  }>;
  summary?: string;
}

/**
 * Contextual flow issue
 */
export interface ContextualFlowIssue {
  category: 'VECTOR' | 'LINGUISTIC' | 'LINKING' | 'MACRO';
  rule: string;
  score: number;
  details: string;
  offendingSnippet?: string;
  remediation: string;
}

/**
 * Flow audit result
 */
export interface FlowAuditResult {
  overallFlowScore: number;
  vectorStraightness: number;
  informationDensity: number;
  issues: ContextualFlowIssue[];
  headingVector: string[];
  discourseGaps: number[];
}

// ============================================================================
// PAGE AUDIT TYPES V2
// ============================================================================

/**
 * Individual audit check
 */
export interface AuditCheck {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  score: number;
  value?: string | number;
  details: string;
  suggestion?: string;
}

/**
 * Phase audit result for UI display
 */
export interface PhaseAuditResult {
  phase: string;
  score: number;
  passedCount: number;
  totalCount: number;
  checks: AuditCheck[];
}

/**
 * Audit task (actionable item)
 */
export interface AuditTask {
  id: string;
  projectId?: string;
  pageId?: string;
  auditId?: string;

  ruleId: string;
  title: string;
  description: string;
  remediation: string;

  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: 'high' | 'medium' | 'low';
  phase?: 'technical' | 'semantic' | 'linkStructure' | 'contentQuality' | 'visualSchema';

  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  completedAt?: string;
  dismissedReason?: string;
  issueGroup?: string;

  createdAt?: string;
  updatedAt?: string;
}

/** Legacy alias for AuditTask */
export type PageAuditActionItem = AuditTask;

/**
 * Full page audit result (stored in database)
 */
export interface PageAudit {
  id: string;
  pageId: string;
  projectId: string;
  version: number;

  // Overall scores
  overallScore: number;
  technicalScore: number;
  semanticScore: number;
  linkStructureScore: number;
  contentQualityScore: number;
  visualSchemaScore: number;

  // Detailed phase results
  technicalChecks: AuditCheck[];
  semanticChecks: AuditCheck[];
  linkStructureChecks: AuditCheck[];
  contentQualityChecks: AuditCheck[];
  visualSchemaChecks: AuditCheck[];

  // AI Analysis (deep audit)
  aiAnalysisComplete: boolean;
  ceAlignmentScore?: number;
  ceAlignmentExplanation?: string;
  scAlignmentScore?: number;
  scAlignmentExplanation?: string;
  csiAlignmentScore?: number;
  csiAlignmentExplanation?: string;
  contentSuggestions?: string[];

  // Summary
  summary: string;
  criticalIssuesCount: number;
  highIssuesCount: number;
  mediumIssuesCount: number;
  lowIssuesCount: number;

  // Change detection
  contentHashAtAudit: string;

  // Audit type
  auditType: 'quick' | 'deep';

  createdAt: string;
}

/** Legacy compatibility alias */
export type PageAuditRecord = PageAudit;

/**
 * Inline page audit result structure
 */
export interface PageAuditResult {
  url: string;
  timestamp: number;
  overallScore: number;
  summary: string;
  phases: {
    technical: PhaseAuditResult;
    semantic: PhaseAuditResult;
    linkStructure: PhaseAuditResult;
    contentQuality: PhaseAuditResult;
    visualSchema: PhaseAuditResult;
  };
  actionItems: PageAuditActionItem[];
  rawData?: {
    jinaExtraction?: unknown;
    gscData?: unknown;
  };
}

/**
 * AI Suggestion for human-in-the-loop workflow
 */
export interface AISuggestion {
  id: string;
  taskId: string;
  projectId: string;
  pageId?: string;
  originalValue: string;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
  modelUsed: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  userModifiedValue?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Audit history snapshot
 */
export interface AuditHistoryEntry {
  id: string;
  projectId: string;
  auditDate: string;

  totalPages: number;
  pagesAudited: number;
  averageScore: number;

  avgTechnicalScore: number;
  avgSemanticScore: number;
  avgLinkStructureScore: number;
  avgContentQualityScore: number;
  avgVisualSchemaScore: number;

  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;

  pagesChanged: number;
  topIssues: { ruleId: string; ruleName: string; count: number }[];
}

// ============================================================================
// LINKING AUDIT TYPES (Multi-Pass)
// ============================================================================

/**
 * Linking audit pass identifiers
 */
export enum LinkingAuditPass {
  FUNDAMENTALS = 'fundamentals',
  NAVIGATION = 'navigation',
  FLOW_DIRECTION = 'flow_direction',
  EXTERNAL = 'external',
  SYMMETRY = 'symmetry'
}

/**
 * Linking issue type - comprehensive list
 */
export type LinkingIssueType =
  // Pass 1: Fundamentals (PageRank & Anchor Text)
  | 'page_link_limit_exceeded'
  | 'anchor_repetition_per_target'
  | 'anchor_repetition'
  | 'generic_anchor'
  | 'link_in_first_sentence'
  | 'missing_annotation_text'
  // Pass 2: Navigation (Boilerplate)
  | 'header_link_overflow'
  | 'footer_link_overflow'
  | 'duplicate_nav_anchor'
  | 'missing_eat_link'
  | 'static_navigation'
  // Pass 3: Flow Direction (Core <- Author)
  | 'wrong_flow_direction'
  | 'premature_core_link'
  | 'missing_contextual_bridge'
  | 'unclosed_loop'
  | 'orphaned_topic'
  // Pass 4: External E-A-T
  | 'unvalidated_external'
  | 'competitor_link'
  | 'missing_eat_reference'
  | 'reference_not_integrated'
  // Legacy types
  | 'missing_hub_link'
  | 'missing_spoke_link'
  | 'link_limit_exceeded'
  | 'missing_quality_node_link';

/**
 * Linking issue detected during audit
 */
export interface LinkingIssue {
  id: string;
  type: LinkingIssueType;
  severity: 'critical' | 'warning' | 'suggestion';
  sourceTopic?: string;
  targetTopic?: string;
  anchorText?: string;
  currentCount?: number;
  limit?: number;
  message: string;
  autoFixable: boolean;
  suggestedFix?: string;
  pass?: LinkingAuditPass;
  sources?: string[];
  externalUrl?: string;
  position?: 'intro' | 'first_paragraph' | 'main_content' | 'supplementary';
}

/**
 * Result of a single linking pass
 */
export interface LinkingPassResult {
  pass: string;
  status: 'passed' | 'issues_found' | 'failed';
  issues: LinkingIssue[];
  autoFixable: boolean;
  summary: string;
}

/**
 * Full linking audit result
 */
export interface LinkingAuditResult {
  id?: string;
  map_id: string;
  passResults: LinkingPassResult[];
  overallScore: number;
  summary: {
    totalLinks: number;
    averageLinksPerPage: number;
    orphanedTopics: string[];
    overLinkedTopics: string[];
    repetitiveAnchors: { text: string; count: number }[];
  };
  autoFixableCount?: number;
  created_at?: string;
}

/**
 * Auto-fix definition for linking issues
 */
export interface LinkingAutoFix {
  issueId: string;
  fixType: 'add_link' | 'remove_link' | 'update_anchor' | 'add_bridge' | 'reposition_link' | 'add_nav_link';
  targetTable: 'content_briefs' | 'topics' | 'navigation_structures' | 'foundation_pages';
  targetId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  confidence: number;
  requiresAI: boolean;
  description?: string;
}

/**
 * Fix history entry for undo capability
 */
export interface LinkingFixHistoryEntry {
  id: string;
  auditId: string;
  issueId: string;
  fixType: string;
  changes: {
    table: string;
    recordId: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  };
  appliedAt: string;
  undoneAt?: string;
  canUndo: boolean;
}

/**
 * Per-target anchor text analysis
 */
export interface AnchorTextByTargetMetric {
  targetTopic: string;
  targetTopicId?: string;
  anchorsUsed: {
    text: string;
    count: number;
    sourceTopics: string[];
  }[];
  hasRepetition: boolean;
  maxRepetition: number;
}

/**
 * External link analysis for E-A-T
 */
export interface ExternalLinkAnalysis {
  url: string;
  domain: string;
  anchorText: string;
  sourceTopic: string;
  purpose?: 'authority' | 'reference' | 'citation' | 'social' | 'unknown';
  isCompetitor: boolean;
  isIntegratedInText: boolean;
  eatScore?: number;
}

// ============================================================================
// SITE-WIDE AUDIT TYPES
// ============================================================================

/**
 * Page link audit (per-page link counts)
 */
export interface PageLinkAudit {
  pageId: string;
  pageTitle: string;
  pageType: 'topic' | 'foundation' | 'pillar';
  linkCounts: {
    navigation: number;
    content: number;
    hierarchical: number;
    total: number;
  };
  isOverLimit: boolean;
  dilutionRisk: 'none' | 'low' | 'medium' | 'high';
  topTargets: { target: string; count: number }[];
  recommendations: string[];
}

/**
 * Site-wide link audit result
 */
export interface SiteLinkAuditResult {
  pages: PageLinkAudit[];
  averageLinkCount: number;
  medianLinkCount: number;
  pagesOverLimit: number;
  totalLinks: number;
  linkDistribution: {
    range: string;
    count: number;
  }[];
  overallScore: number;
}

/**
 * Link graph node for PageRank analysis
 */
export interface LinkGraphNode {
  id: string;
  title: string;
  topicClass: 'monetization' | 'informational' | 'navigational' | 'foundation';
  clusterRole: 'pillar' | 'cluster_content' | 'standalone';
  incomingLinks: number;
  outgoingLinks: number;
  pageRankScore?: number;
}

/**
 * Link graph edge
 */
export interface LinkGraphEdge {
  source: string;
  target: string;
  anchor: string;
  linkType: 'contextual' | 'hierarchical' | 'navigation';
}

/**
 * Flow violation in link structure
 */
export interface FlowViolation {
  type: 'reverse_flow' | 'orphaned' | 'no_cluster_support' | 'link_hoarding' | 'excessive_outbound';
  sourcePage: string;
  sourceTitle: string;
  targetPage?: string;
  targetTitle?: string;
  severity: 'warning' | 'critical';
  recommendation: string;
}

/**
 * Link flow analysis result
 */
export interface LinkFlowAnalysis {
  graph: {
    nodes: LinkGraphNode[];
    edges: LinkGraphEdge[];
  };
  flowViolations: FlowViolation[];
  flowScore: number;
  centralEntityReachability: number;
  coreToAuthorRatio: number;
  orphanedPages: string[];
  hubPages: string[];
}

/**
 * N-gram presence for consistency checks
 */
export interface NGramPresence {
  term: string;
  inHeader: boolean;
  inFooter: boolean;
  inHomepage: boolean;
  inPillarPages: string[];
  missingFrom: string[];
}

/**
 * Boilerplate inconsistency
 */
export interface BoilerplateInconsistency {
  field: string;
  variations: string[];
  occurrences: number;
  recommendation: string;
}

/**
 * Site-wide N-gram audit
 */
export interface SiteWideNGramAudit {
  centralEntityPresence: NGramPresence;
  sourceContextPresence: NGramPresence;
  pillarTermPresence: { pillar: string; presence: NGramPresence }[];
  inconsistentBoilerplate: BoilerplateInconsistency[];
  overallConsistencyScore: number;
}

/**
 * Navigation segment type
 */
export type NavigationSegment = 'core_section' | 'author_section' | 'pillar' | 'cluster' | 'foundation';

/**
 * Dynamic navigation rule
 */
export interface DynamicNavigationRule {
  segment: NavigationSegment;
  headerLinks: {
    include: string[];
    exclude: string[];
    maxLinks: number;
    prioritizeBy: 'relevance' | 'recency' | 'authority';
  };
  footerLinks: {
    include: string[];
    exclude: string[];
    prioritizeByProximity: boolean;
  };
  sidebarLinks?: {
    showClusterSiblings: boolean;
    showParentPillar: boolean;
    maxLinks: number;
  };
}

/**
 * Dynamic navigation configuration
 */
export interface DynamicNavigationConfig {
  enabled: boolean;
  rules: DynamicNavigationRule[];
  defaultSegment?: NavigationSegment;
  fallbackToStatic: boolean;
}

/**
 * Combined site-wide audit result
 */
export interface SiteWideAuditResult {
  linkAudit: SiteLinkAuditResult;
  flowAnalysis: LinkFlowAnalysis;
  ngramAudit: SiteWideNGramAudit;
  dynamicNavConfig?: DynamicNavigationConfig;
  overallScore: number;
  timestamp: string;
}

// ============================================================================
// UNIFIED AUDIT SYSTEM TYPES
// ============================================================================

/**
 * Audit rule definition
 */
export interface AuditRule {
  id: string;
  name: string;
  severity: AuditSeverity;
  category: string;
  description?: string;
}

/**
 * Audit category with rules and weight
 */
export interface AuditCategory {
  id: string;
  name: string;
  rules: AuditRule[];
  weight: number;
}

/**
 * Individual audit issue found
 */
export interface UnifiedAuditIssue {
  id: string;
  ruleId: string;
  ruleName: string;
  category: string;
  severity: AuditSeverity;
  message: string;
  details?: string;
  affectedItems?: string[];
  autoFixable: boolean;
  fixType?: 'auto' | 'ai-assisted' | 'manual';
  suggestedFix?: string;
}

/**
 * Category result in unified audit
 */
export interface AuditCategoryResult {
  categoryId: string;
  categoryName: string;
  score: number;
  weight: number;
  issueCount: number;
  autoFixableCount: number;
  issues: UnifiedAuditIssue[];
}

/**
 * Full unified audit result
 */
export interface UnifiedAuditResult {
  id: string;
  map_id: string;
  overallScore: number;
  categories: AuditCategoryResult[];
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  suggestionCount: number;
  autoFixableCount: number;
  runAt: string;
  runBy?: string;
}

/**
 * Audit fix definition
 */
export interface AuditFix {
  id: string;
  issueId: string;
  fixType: 'auto' | 'ai-assisted' | 'manual';
  description: string;
  changes?: {
    table: string;
    id: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  aiPrompt?: string;
  canUndo: boolean;
  status: 'pending' | 'applied' | 'undone' | 'failed';
}

/**
 * Audit fix history entry
 */
export interface AuditFixHistoryEntry {
  id: string;
  map_id: string;
  audit_run_id: string;
  category: string;
  issue_id: string;
  fix_description: string;
  changes: {
    table: string;
    id: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  applied_at: string;
  applied_by?: string;
  undone_at?: string;
  can_undo: boolean;
}

// ============================================================================
// SCHEMA VALIDATION TYPES
// ============================================================================

/**
 * Schema validation error
 */
export interface SchemaValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  category: 'syntax' | 'schema_org' | 'content_parity' | 'eav_consistency' | 'entity' | 'freshness';
  suggestion?: string;
  autoFixable: boolean;
}

/**
 * Schema validation warning
 */
export interface SchemaValidationWarning {
  path: string;
  message: string;
  recommendation: string;
  category: string;
}

/**
 * Full schema validation result
 */
export interface SchemaValidationResult {
  isValid: boolean;
  overallScore: number;

  // Categorized errors
  syntaxErrors: SchemaValidationError[];
  schemaOrgErrors: SchemaValidationError[];
  contentParityErrors: SchemaValidationError[];
  eavConsistencyErrors: SchemaValidationError[];
  entityErrors: SchemaValidationError[];

  // Warnings
  warnings: SchemaValidationWarning[];

  // Auto-fix tracking
  autoFixApplied: boolean;
  autoFixChanges: string[];
  autoFixIterations: number;

  // External validation (optional)
  externalValidationRun: boolean;
  externalValidationResult?: {
    source: string;
    isValid: boolean;
    errors: string[];
  };
}

// ============================================================================
// SEMANTIC AUDIT TYPES
// ============================================================================

/**
 * Alignment scores for semantic audit
 */
export interface AlignmentScores {
  ceAlignment: number;
  scAlignment: number;
  csiAlignment: number;
  ceGap: string;
  scGap: string;
  csiGap: string;
}

/**
 * Core entities analysis (forward declaration of complex nested type)
 */
export interface CoreEntities {
  centralEntity?: string;
  sourceContext?: string;
  searchIntent?: string;
  detectedSourceContext?: string;
  identifiedEntities?: string[];
  entityTypes?: Record<string, string>;
}

/**
 * Macro analysis result
 */
export interface MacroAnalysis {
  topicalCoverage?: number;
  contextualDepth?: number;
  semanticCoherence?: number;
  gaps?: string[];
  contextualVector?: string;
  hierarchy?: string;
  sourceContext?: string;
}

/**
 * Micro analysis result
 */
export interface MicroAnalysis {
  lexicalDiversity?: number;
  sentenceComplexity?: number;
  keywordDensity?: Record<string, number>;
  issues?: string[];
  sentenceStructure?: string;
  informationDensity?: string;
  htmlSemantics?: string;
}

/**
 * Semantic action item
 */
export interface SemanticActionItem {
  id: string;
  type: string;
  title: string;
  target?: string;
  description: string;
  category: string;
  impact: string;
  priority?: 'high' | 'medium' | 'low';
  ruleReference?: string;
  smartFix?: unknown;
  structuredFix?: {
    type?: string;
    before?: string;
    after?: string;
    location?: string;
    [key: string]: unknown;
  };
}

/**
 * Semantic audit result
 */
export interface SemanticAuditResult {
  overallScore: number;
  summary: string;
  coreEntities: CoreEntities;
  macroAnalysis: MacroAnalysis;
  microAnalysis: MicroAnalysis;
  actions: SemanticActionItem[];
  analyzedAt: string;
  alignmentScores?: AlignmentScores;
}

// ============================================================================
// CORPUS AUDIT TYPES
// ============================================================================

/**
 * Corpus audit configuration
 */
export interface CorpusAuditConfig {
  domain: string;
  sitemapUrl?: string;
  maxPages?: number;
  targetEAVs?: SemanticTriple[];
  checkDuplicates: boolean;
  checkAnchors: boolean;
  checkCoverage: boolean;
}

/**
 * Corpus audit progress
 */
export interface CorpusAuditProgress {
  phase: 'discovering' | 'crawling' | 'analyzing' | 'detecting_overlaps' | 'calculating_metrics' | 'complete' | 'error';
  currentStep: string;
  totalPages: number;
  processedPages: number;
  progress: number;
  error?: string;
}

/**
 * Corpus page data
 */
export interface CorpusPage {
  url: string;
  title: string;
  wordCount: number;
  headings: (string | { level: number; text: string })[];
  topics?: string[];
  lastCrawled?: string;
  internalLinks?: { url: string; anchorText: string }[];
  externalLinks?: { url: string; anchorText: string }[];
}

/**
 * Content overlap detection
 */
export interface ContentOverlap {
  urls?: string[];
  overlapPercentage: number;
  sharedContent?: string;
  sharedPhrases?: string[];
  type?: 'duplicate' | 'near_duplicate' | 'partial';
  overlapType?: string;
  pageA?: string;
  pageB?: string;
}

/**
 * Anchor text pattern analysis
 */
export interface AnchorTextPattern {
  anchor?: string;
  anchorText?: string;
  frequency: number;
  targets?: string[];
  targetUrls?: string[];
  isOverOptimized: boolean;
  isGeneric: boolean;
}

/**
 * Corpus metrics
 */
export interface CorpusMetrics {
  totalPages: number;
  avgWordCount: number;
  duplicateRatio?: number;
  orphanRatio?: number;
  internalLinkDensity?: number;
  contentFreshness?: number;
  totalWordCount?: number;
  avgInternalLinks?: number;
  avgExternalLinks?: number;
  avgHeadings?: number;
  topicalCoverage?: number;
}

/**
 * Corpus audit issue
 */
export interface CorpusAuditIssue {
  type: 'duplicate_content' | 'thin_content' | 'orphan_page' | 'anchor_over_optimization' | 'generic_anchors' | 'coverage_gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedUrls: string[];
  description: string;
  details?: string;
}

/**
 * Corpus audit recommendation
 */
export interface CorpusAuditRecommendation {
  type: 'consolidate' | 'expand' | 'relink' | 'diversify_anchors' | 'add_content';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedUrls: string[];
  suggestedAction: string;
}

/**
 * Complete corpus audit result
 */
export interface CorpusAuditResult {
  domain: string;
  timestamp: string;

  pages: CorpusPage[];
  contentOverlaps: ContentOverlap[];
  anchorPatterns: AnchorTextPattern[];

  semanticCoverage: {
    covered: SemanticTriple[];
    missing: SemanticTriple[];
    coveragePercentage: number;
  };

  metrics: CorpusMetrics;
  issues: CorpusAuditIssue[];
  recommendations: CorpusAuditRecommendation[];
}

// ============================================================================
// QUERY NETWORK AUDIT TYPES
// ============================================================================

/**
 * Query network audit configuration
 */
export interface QueryNetworkAuditConfig {
  seedKeyword: string;
  targetDomain?: string;
  language: string;
  region?: string;
  maxQueries?: number;
  maxCompetitors?: number;
  includeEntityValidation?: boolean;
  includeOwnContent?: boolean;
  /** GSC search analytics rows to enrich analysis with real data */
  gscData?: import('../types').GscRow[];
  /** Crawled site inventory from the Discover step — used to build comprehensive own-content EAVs */
  siteInventory?: Array<{
    url: string;
    title?: string;
    word_count?: number;
    headings?: { level: number; text: string }[];
    page_h1?: string;
    meta_description?: string;
  }>;
  /** Google URL Inspection API results */
  urlInspectionResults?: Array<{ url: string; verdict: string; indexingState: string; lastCrawlTime?: string; pageFetchState?: string }>;
  /** Google Cloud NLP entity salience results */
  entitySalienceResults?: Array<{ name: string; type: string; salience: number; mentions: any[] }>;
  /** Google Trends data via SerpAPI */
  trendsData?: { interestOverTime: Array<{ date: string; value: number }>; relatedQueries: any[]; risingQueries: any[] };
  /** GA4 page metrics */
  ga4Metrics?: Array<{ pagePath: string; sessions: number; totalUsers: number; pageviews: number; bounceRate: number; avgSessionDuration: number }>;
  /** Knowledge Graph entity data */
  knowledgeGraphEntity?: any;
}

/**
 * Query network audit progress
 */
export interface QueryNetworkAuditProgress {
  phase: 'generating_network' | 'fetching_serps' | 'extracting_eavs' | 'analyzing_gaps' | 'validating_entities' | 'enriching_gsc' | 'complete' | 'error';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  progress: number;
  error?: string;
}

/**
 * Query network recommendation
 */
export interface QueryNetworkRecommendation {
  type: 'content_gap' | 'density_improvement' | 'structure_fix' | 'new_topic';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedQueries: string[];
  estimatedImpact: string;
  suggestedAction: string;
}

/**
 * Audit report section for business/technical toggle
 */
export interface AuditReportSection {
  id: string;
  title: string;
  businessSummary: string;
  technicalDetails: string;
  metrics: Record<string, number | string>;
  visualizationType?: 'chart' | 'table' | 'list' | 'heatmap';
  data: unknown;
}

/**
 * Complete audit report with business/technical views
 */
export interface ComprehensiveAuditReport {
  id: string;
  title: string;
  generatedAt: string;
  auditType: 'query_network' | 'single_page' | 'multi_page' | 'authority';
  overallScore: number;
  sections: AuditReportSection[];
  executiveSummary: string;
  technicalSummary: string;
  prioritizedActions: QueryNetworkRecommendation[];
  exportFormats: ('xlsx' | 'pdf' | 'html')[];
}

// ============================================================================
// VISUAL SEMANTICS VALIDATION TYPES
// ============================================================================

/**
 * Alt text validation result (audit-specific)
 */
export interface AuditAltTextResult {
  imageUrl: string;
  hasAlt: boolean;
  altText?: string;
  isDescriptive: boolean;
  containsKeywords: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * File name validation result (audit-specific)
 */
export interface AuditFileNameResult {
  url: string;
  originalName: string;
  isDescriptive: boolean;
  containsKeywords: boolean;
  issues: string[];
  suggestedName?: string;
}

/**
 * Visual semantics validation result (audit-specific)
 */
export interface AuditVisualSemanticsResult {
  totalImages: number;
  imagesWithAlt: number;
  imagesWithDescriptiveAlt: number;
  altTextResults: AuditAltTextResult[];
  fileNameResults: AuditFileNameResult[];
  overallScore: number;
  recommendations: string[];
}

// ============================================================================
// HREFLANG VALIDATION TYPES
// ============================================================================

/**
 * Hreflang validation result (audit-specific)
 */
export interface AuditHreflangResult {
  url: string;
  declaredLanguages: string[];
  issues: {
    type: 'missing_return_link' | 'invalid_language' | 'self_reference_missing' | 'x_default_missing';
    severity: 'error' | 'warning';
    message: string;
  }[];
  isValid: boolean;
}

// ============================================================================
// KNOWLEDGE GRAPH TYPES
// ============================================================================

// AdminProject is defined in core.ts (canonical location)

/**
 * Knowledge graph node
 */
export interface KnowledgeNode {
  id: string;
  term: string;
  type: string;
  definition: string;
  metadata: {
    importance: number;
    source: string;
    [key: string]: any;
  };
}

/**
 * Knowledge graph edge
 */
export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  metadata: {
    source: string;
    [key: string]: any;
  };
}

/**
 * Topic recommendation
 */
export interface TopicRecommendation {
    id: string;
    title: string;
    slug: string;
    description: string;
    category: 'GAP_FILLING' | 'COMPETITOR_BASED' | 'EXPANSION';
    reasoning: string;
}

/**
 * WordNet interface for semantic distance calculations
 */
export interface WordNetInterface {
  getHypernyms(concept: string): Promise<string[]>;
  getDepth(concept: string): Promise<number>;
  getMaxDepth(): Promise<number>;
  findLCS(concept1: string, concept2: string): Promise<string[]>;
  getShortestPath(concept1: string, concept2: string): Promise<number>;
}

// ============================================================================
// SEO AUDIT REPORT TYPES
// ============================================================================

export type ReportScope = 'page' | 'site';
export type ReportAudience = 'business' | 'technical';
export type HealthStatus = 'excellent' | 'good' | 'needs-work' | 'critical';
export type EffortLevel = 'Quick Fix' | 'Moderate' | 'Complex';

/**
 * Full SEO audit report
 */
export interface SEOAuditReport {
  id: string;
  projectId: string;
  pageId?: string;
  scope: ReportScope;
  generatedAt: string;

  executiveSummary: {
    overallScore: number;
    healthStatus: HealthStatus;
    keyFindings: string[];
    pagesAnalyzed: number;
    issuesCritical: number;
    issuesHigh: number;
    issuesMedium: number;
    issuesLow: number;
  };

  phaseScores: {
    technical: { score: number; passed: number; total: number };
    semantic: { score: number; passed: number; total: number };
    linkStructure: { score: number; passed: number; total: number };
    contentQuality: { score: number; passed: number; total: number };
    visualSchema: { score: number; passed: number; total: number };
  };

  pillarContext?: {
    centralEntity: string;
    centralEntityExplanation: string;
    sourceContext: string;
    sourceContextExplanation: string;
    centralSearchIntent: string;
  };

  issues: ReportIssue[];

  progress: {
    totalTasks: number;
    completed: number;
    pending: number;
    dismissed: number;
  };

  pages?: PageReportSummary[];
}

/**
 * Report issue entry
 */
export interface ReportIssue {
  id: string;
  ruleId: string;
  phase: string;
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Business view fields
  headline: string;
  whyItMatters: string;
  businessImpact: string;
  suggestedAction: string;
  effortLevel: EffortLevel;

  // Technical view fields
  technicalDetails: {
    ruleName: string;
    actualValue?: string | number;
    expectedValue?: string | number;
    remediation: string;
    aiSuggestion?: string;
  };

  affectedPages: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

/**
 * Page report summary
 */
export interface PageReportSummary {
  url: string;
  title: string;
  overallScore: number;
  issueCount: number;
  topIssue?: string;
}

/**
 * Business language translation for audit findings
 */
export interface BusinessLanguageTranslation {
  headline: string;
  whyItMatters: string;
  businessImpact: string;
  effortLevel: EffortLevel;
}

/**
 * Business name for audit phase
 */
export interface PhaseBusinessName {
  name: string;
  explanation: string;
}

// ============================================================================
// FOUNDATION & NAVIGATION ISSUE TYPES
// ============================================================================

/**
 * Foundation page issues
 */
export interface FoundationPageIssues {
  missingPages: FoundationPageType[];
  incompletePages: { type: FoundationPageType; missing: string[] }[];
  napIssues?: string[];
}

/**
 * Navigation issues
 */
export interface NavigationIssues {
  headerLinkCount: number;
  footerLinkCount: number;
  warnings: string[];
}

// ============================================================================
// TELEMETRY TYPES
// ============================================================================

/**
 * Telemetry log entry
 */
export interface TelemetryLog {
    id: string;
    timestamp: number;
    provider: string;
    model: string;
    operation: string;
    tokens_in: number;
    tokens_out: number;
    cost_est: number;
}

// ============================================================================
// CONTENT GENERATION AUDIT TYPES
// ============================================================================

/**
 * Comprehensive audit details for content generation
 */
export interface AuditDetails {
  algorithmicResults: AuditRuleResult[];
  aiAuditResult?: {
    semanticScore: number;
    suggestions: string[];
  };
  passingRules: number;
  totalRules: number;
  timestamp: string;
  // Semantic Compliance Score (target >= 85%)
  complianceScore?: {
    overall: number;
    passed: boolean;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    breakdown: {
      eavCoverage: number;
      contextualFlow: number;
      anchorDiversity: number;
      formatCompliance: number;
      schemaCompleteness: number;
      visualHierarchy: number;
      centralEntityFocus: number;
      subordinateText: number;
      freshnessSignals: number;
    };
    issues: Array<{
      factor: string;
      severity: 'critical' | 'major' | 'minor';
      message: string;
      recommendation: string;
    }>;
    recommendations: string[];
  };
  // Cross-page EAV consistency check results (Knowledge-Based Trust)
  crossPageContradictions?: Array<{
    entity: string;
    attribute: string;
    currentValue: string;
    conflictingValue: string;
    conflictingArticle: { id: string; title: string };
  }>;
}

/**
 * Comprehensive quality report stored with content generation jobs.
 * This captures the full quality enforcement state including rule compliance,
 * violations, pass tracking, and systemic checks.
 */
export interface QualityReport {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Scores by rule category (A-S) */
  categoryScores: Record<string, number>;
  /** Rule violations found during generation */
  violations: Array<{
    rule: string;
    text: string;
    severity: 'error' | 'warning' | 'info';
    suggestion: string;
  }>;
  /** Pass-by-pass quality deltas */
  passDeltas: Array<{
    passNumber: number;
    rulesFixed: string[];
    rulesRegressed: string[];
    netChange: number;
  }>;
  /** Systemic/structural checks (word count, image balance, etc.) */
  systemicChecks: Array<{
    checkId: string;
    name: string;
    status: 'pass' | 'warning' | 'fail';
    value: string;
  }>;
  /** When this report was generated */
  generatedAt: string;
  /** The generation mode used (autonomous or supervised) */
  generationMode: 'autonomous' | 'supervised';
}
