/**
 * Migration Types Module
 *
 * Contains migration and merge types including:
 * - TransitionStatus: Site migration workflow status
 * - SiteInventoryItem: Page inventory for migration
 * - MergeWizardStep: Map merge wizard steps
 * - MapMergeState: Full merge wizard state
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/migration
 */

import { SemanticTriple, FreshnessProfile } from './semantic';
import type { EnrichedTopic } from './content';
import type { BusinessInfo, SEOPillars } from './business';
import type { TopicalMap } from './core';

// ============================================================================
// FORWARD DECLARATIONS (backward-compatible aliases)
// ============================================================================

type EnrichedTopicRef = EnrichedTopic;
type TopicalMapRef = TopicalMap;
type BusinessInfoRef = BusinessInfo;
type SEOPillarsRef = Partial<SEOPillars>;

// ============================================================================
// SITE MIGRATION TYPES
// ============================================================================

/**
 * Transition status for site migration
 */
export type TransitionStatus = 'AUDIT_PENDING' | 'GAP_ANALYSIS' | 'ACTION_REQUIRED' | 'IN_PROGRESS' | 'OPTIMIZED';

/**
 * Action type for migration decisions
 */
export type ActionType = 'KEEP' | 'OPTIMIZE' | 'REWRITE' | 'MERGE' | 'REDIRECT_301' | 'PRUNE_410' | 'CANONICALIZE' | 'CREATE_NEW';

/**
 * Section type classification
 */
export type SectionType = 'CORE_SECTION' | 'AUTHOR_SECTION' | 'ORPHAN';

/**
 * Site inventory item for migration workbench
 */
export interface SiteInventoryItem {
  id: string;
  project_id: string;
  url: string;
  title: string;
  http_status: number;
  content_hash?: string;

  // Metrics
  word_count?: number;
  link_count?: number;
  dom_size?: number; // KB
  ttfb_ms?: number;
  cor_score?: number; // 0-100 (High = Bad)

  // GSC Metrics
  gsc_clicks?: number;
  gsc_impressions?: number;
  gsc_position?: number;
  index_status?: string;
  striking_distance_keywords?: string[];

  // Audit & Analysis
  audit_score?: number;
  audit_snapshot_id?: string;
  match_category?: string;
  recommended_action?: string;
  detected_ce?: string;

  // Page metadata
  page_title?: string;
  page_h1?: string;
  meta_description?: string;
  headings?: { level: number; text: string }[];
  language?: string;

  // Performance & Technical
  cwv_assessment?: string;
  google_canonical?: string;
  schema_types?: string[];
  internal_link_count?: number;
  external_link_count?: number;

  // Pillar alignment scores
  ce_alignment?: number;
  sc_alignment?: number;
  csi_alignment?: number;
  detected_sc?: string;
  detected_csi?: string;
  semantic_overall_score?: number;
  match_confidence?: number;
  match_source?: string;
  content_cached_at?: string;

  // Action details
  action_reasoning?: string;
  action_data_points?: { label: string; value: string; impact?: string }[];
  action_priority?: number;
  action_effort?: 'none' | 'low' | 'medium' | 'high';
  last_audited_at?: string;

  // CrUX / Core Web Vitals
  cwv_lcp?: number;
  cwv_inp?: number;
  cwv_cls?: number;

  // URL Inspection data
  google_index_verdict?: string;
  last_crawled_at?: string;
  mobile_usability?: string;
  rich_results_status?: string;

  // Strategy & Mapping
  mapped_topic_id: string | null;
  section?: SectionType;
  status: TransitionStatus;
  action?: ActionType;

  created_at: string;
  updated_at: string;
}

/**
 * Content snapshot for migration history
 */
export interface TransitionSnapshot {
  id: string;
  inventory_id: string;
  created_at: string;
  content_markdown: string;
  snapshot_type: 'ORIGINAL_IMPORT' | 'PRE_OPTIMIZATION' | 'POST_OPTIMIZATION';
}

// ============================================================================
// SMART MIGRATION TYPES (Content Harvesting)
// ============================================================================

/**
 * Content chunk for harvesting
 */
export interface ContentChunk {
  id: string;
  content: string;
  heading?: string;
  summary: string;
  semantic_embedding?: number[]; // For future vector search
  suggested_topic_id?: string;
  quality_score: number; // 0-100
  tags: string[];
}

/**
 * Migration decision with AI recommendation
 */
export interface MigrationDecision {
  sourceUrl: string;
  targetTopicId: string;
  recommendation: 'REDIRECT_301' | 'MERGE' | 'PRUNE' | 'KEEP' | 'REWRITE';
  confidence: number;
  pros: string[];
  cons: string[];
  reasoning: string;
}

// ============================================================================
// MAP MERGE TYPES
// ============================================================================

/**
 * Merge wizard step
 */
export type MergeWizardStep = 'select' | 'context' | 'eavs' | 'topics' | 'review';

/**
 * Context conflict during merge
 */
export interface ContextConflict {
  field: string;
  values: { mapId: string; mapName: string; value: unknown }[];
  aiSuggestion: { value: unknown; reasoning: string } | null;
  resolution: 'mapA' | 'mapB' | 'ai' | 'custom' | null;
  customValue?: unknown;
}

/**
 * EAV decision during merge
 */
export interface EavDecision {
  eavId: string;
  sourceMapId: string;
  action: 'include' | 'exclude' | 'merge';
  conflictWith?: string;
  resolvedValue?: string;
}

/**
 * Topic similarity result from AI analysis
 */
export interface TopicSimilarityResult {
  id: string;
  topicA: EnrichedTopicRef;
  topicB: EnrichedTopicRef;
  similarityScore: number;
  matchType: 'exact' | 'semantic' | 'parent_child';
  aiSuggestedAction: 'merge' | 'parent_child' | 'keep_separate';
  aiSuggestedTitle?: string;
  aiSuggestedParent?: string;
  reasoning: string;
}

/**
 * Topic merge decision
 */
export interface TopicMergeDecision {
  id: string;
  topicAId: string | null;
  topicBId: string | null;
  userDecision: 'merge' | 'keep_both' | 'keep_a' | 'keep_b' | 'delete' | 'pending';
  finalTitle: string;
  finalDescription: string;
  finalType: 'core' | 'outer' | 'child';
  finalParentId: string | null;
}

/**
 * Map merge analysis result from AI
 */
export interface MapMergeAnalysis {
  contextRecommendations: {
    field: string;
    recommendation: unknown;
    reasoning: string;
    confidence: number;
  }[];
  eavAnalysis: {
    unique: { mapId: string; eav: SemanticTriple }[];
    duplicates: { eavs: SemanticTriple[]; keep: SemanticTriple }[];
    conflicts: {
      subject: string;
      predicate: string;
      values: { mapId: string; value: unknown }[];
      recommendation: unknown;
      reasoning: string;
    }[];
  };
  topicSimilarities: TopicSimilarityResult[];
}

/**
 * Import history entry for merge tracking
 */
export interface ImportHistoryEntry {
  timestamp: string;
  filename: string;
  changes: {
    topicsAdded: number;
    topicsDeleted: number;
    topicsModified: number;
    decisionsChanged: number;
  };
}

/**
 * Full map merge wizard state
 */
export interface MapMergeState {
  step: MergeWizardStep;
  selectedMapIds: string[];
  sourceMaps: TopicalMapRef[];

  // Step 2: Context
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: Partial<SEOPillars> | null;
  };
  contextConflicts: ContextConflict[];

  // Step 3: EAVs
  resolvedEavs: SemanticTriple[];
  eavDecisions: EavDecision[];

  // Step 4: Topics
  topicSimilarities: TopicSimilarityResult[];
  topicDecisions: TopicMergeDecision[];
  newTopics: EnrichedTopicRef[];
  excludedTopicIds: string[];

  // Step 5: Review
  finalTopics: EnrichedTopicRef[];
  newMapName: string;

  // Import/Export
  importHistory: ImportHistoryEntry[];

  // Analysis state
  isAnalyzing: boolean;
  analysisError: string | null;
  isCreating: boolean;
}

/**
 * Export row for Excel/CSV merge export
 */
export interface MergeExportTopicRow {
  id: string;
  sourceMap: string;
  title: string;
  description: string;
  type: 'core' | 'outer' | 'child';
  parentTitle: string | null;
  mergeDecision: 'keep' | 'merge' | 'delete' | 'new';
  mergePartnerTitle: string | null;
  finalTitle: string | null;
  include: 'yes' | 'no';
  notes: string;
}

/**
 * Merge execution input
 */
export interface MergeExecutionInput {
  sourceMaps: TopicalMapRef[];
  newMapName: string;
  projectId: string;
  userId: string;
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: Partial<SEOPillars> | null;
  };
  resolvedEavs: SemanticTriple[];
  resolvedCompetitors: string[];
  topicDecisions: TopicMergeDecision[];
  excludedTopicIds: string[];
  newTopics: EnrichedTopicRef[];
}

// ============================================================================
// FORWARD DECLARATIONS (for MergeExecutionResult)
// ============================================================================

// TopicalMapFull is an alias for TopicalMap
type TopicalMapFull = TopicalMap;

// ============================================================================
// MIGRATION PLAN
// ============================================================================

/**
 * Migration plan for site transition tracking
 */
export interface MigrationPlan {
    id: string;
    project_id: string;
    map_id: string;
    name: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
    gsc_start_date?: string;
    gsc_end_date?: string;
    total_urls: number;
    total_topics: number;
    matched_count: number;
    orphan_count: number;
    gap_count: number;
    cannibalization_count: number;
    keep_count: number;
    optimize_count: number;
    rewrite_count: number;
    merge_count: number;
    redirect_count: number;
    prune_count: number;
    create_count: number;
    completed_count: number;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// MERGE EXECUTION RESULT
// ============================================================================

/**
 * Result from executing a map merge operation
 */
export interface MergeExecutionResult {
  newMap: TopicalMapFull;
  topicsCreated: number;
  warnings: string[];
}
