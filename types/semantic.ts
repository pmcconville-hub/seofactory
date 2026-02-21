/**
 * Semantic Types Module
 *
 * Contains semantic SEO types including:
 * - SemanticTriple: Entity-Attribute-Value triples
 * - AttributeCategory/AttributeClass: Classification types
 * - AttributeMetadata: Deep metadata for EAVs
 * - Related topic and expansion types
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/semantic
 */

import type { EnrichedTopic } from './content';
import { KPMetadata } from './business';

// ============================================================================
// ATTRIBUTE CLASSIFICATION
// ============================================================================

/**
 * Research-based Attribute Classification
 * Used to categorize EAV predicates for content strategy
 */
export type AttributeCategory =
  | 'CORE_DEFINITION'        // Essential defining attributes
  | 'SEARCH_DEMAND'          // Attributes with search volume
  | 'COMPETITIVE_EXPANSION'  // Attributes competitors cover
  | 'COMPOSITE'              // Compound attributes
  | 'UNIQUE'                 // Legacy - unique differentiators
  | 'ROOT'                   // Legacy - fundamental attributes
  | 'RARE'                   // Legacy - less common attributes
  | 'COMMON'                 // Legacy - frequently used attributes
  | 'UNCLASSIFIED';          // Not yet classified

/**
 * Attribute class for semantic organization
 */
export type AttributeClass =
  | 'TYPE'          // What something is
  | 'COMPONENT'     // Parts/elements
  | 'BENEFIT'       // Advantages/outcomes
  | 'RISK'          // Disadvantages/concerns
  | 'PROCESS'       // How-to/methodology
  | 'SPECIFICATION'; // Technical details

// ============================================================================
// ATTRIBUTE METADATA
// ============================================================================

/**
 * Deep metadata for EAV attributes
 * Provides validation, presentation, and computation rules
 */
export interface AttributeMetadata {
  validation?: {
    type: 'CURRENCY' | 'NUMBER' | 'STRING' | 'BOOLEAN';
    min?: number;
    max?: number;
    options?: string[];
  };
  presentation?: {
    prominence: 'CENTERPIECE' | 'STANDARD' | 'SUPPLEMENTARY';
  };
  dependency?: {
    dependsOn: string;
    rule: string;
  };
  computation?: {
    originalUnit: string;
    displayUnit: string;
    conversion: string;
  };
}

// ============================================================================
// SEMANTIC TRIPLE (EAV)
// ============================================================================

/**
 * Semantic Triple (Entity-Attribute-Value)
 * Core data structure for knowledge representation
 */
export interface SemanticTriple {
  subject: {
    id?: string;
    label: string;
    type: string;
  };
  predicate: {
    relation: string;
    type: string;
    category?: AttributeCategory; // Research-based classification
    classification?: AttributeClass;
  };
  object: {
    value: string | number;
    type: string;
    unit?: string;
    truth_range?: string;
  };
  // Flat aliases for legacy/convenience access
  entity?: string;              // Alias for subject.label
  attribute?: string;           // Alias for predicate.relation
  value?: string | number;      // Alias for object.value
  category?: AttributeCategory; // Alias for predicate.category
  classification?: AttributeClass; // Alias for predicate.classification
  label?: string;               // Alias for subject.label
  relation?: string;            // Alias for predicate.relation
  metadata?: AttributeMetadata; // Deep metadata for EAV
  lexical?: {
    synonyms?: string[];    // Alternative terms for the object value
    antonyms?: string[];    // Opposite/contrasting concepts
    hypernyms?: string[];   // Broader category terms
  };
  kpMetadata?: KPMetadata;    // Knowledge Panel contribution tracking
  context?: string;            // Context string for EAV usage
  confidence?: number;         // Confidence score (0-1) for auto-generated EAVs
  source?: string;             // Source of the EAV (e.g., 'catalog', 'ai', 'manual')
}

// ============================================================================
// TOPIC BLUEPRINT & EXPANSION
// ============================================================================

/**
 * Topic expansion mode for generating related content
 */
export type ExpansionMode = 'ATTRIBUTE' | 'ENTITY' | 'CONTEXT' | 'FRAME' | 'CHILD';

/**
 * Blueprint for topic content structure
 */
export interface TopicBlueprint {
  contextual_vector: string; // H2 sequence
  methodology: string;
  subordinate_hint: string;
  perspective: string;
  interlinking_strategy: string;
  anchor_text: string;
  annotation_hint: string;
  image_alt_text?: string;
}

// ============================================================================
// FRESHNESS PROFILE
// ============================================================================

/**
 * Content freshness requirements
 */
export enum FreshnessProfile {
  EVERGREEN = 'EVERGREEN',
  STANDARD = 'STANDARD',
  FREQUENT = 'FREQUENT',
  TIME_SENSITIVE = 'TIME_SENSITIVE',
  FAST = 'FAST',
}

// ============================================================================
// ENTITY/CONTEXT OPTIONS (for wizards)
// ============================================================================

/**
 * Candidate entity for pillar selection
 */
export interface CandidateEntity {
  entity: string;
  reasoning: string;
  score: number;
}

/**
 * Source context option for pillar selection
 */
export interface SourceContextOption {
  context: string;
  reasoning: string;
  score: number;
}

// ============================================================================
// FRAME SEMANTICS
// Based on Fillmore's Frame Semantics theory
// ============================================================================

/**
 * Frame role types based on Fillmore's Frame Semantics
 */
export type FrameRole = 'agent' | 'patient' | 'instrument' | 'location' | 'time' | 'manner' | 'cause' | 'result' | 'beneficiary' | 'experiencer';

/**
 * An action within a semantic frame (verb + participants)
 */
export interface FrameAction {
  verb: string;
  agent: string;
  patient?: string;
  instrument?: string;
  result?: string;
}

/**
 * A single element within a semantic frame
 */
export interface FrameElement {
  role: FrameRole;
  entity: string;
  semantic_type: string;
  is_core: boolean; // Core vs peripheral frame element
}

/**
 * Scene setting for a semantic frame
 */
export interface SceneSetting {
  environment: string;
  temporal_context: string;
  social_context?: string;
  physical_context?: string;
}

/**
 * Complete semantic frame analysis result
 */
export interface SemanticFrame {
  frame_name: string;
  frame_description: string;
  actions: FrameAction[];
  core_elements: FrameElement[];
  peripheral_elements: FrameElement[];
  scene_setting: SceneSetting;
  related_frames?: string[]; // Linked frames for expanded coverage
}

/**
 * Result of frame-based topic expansion
 */
export interface FrameExpansionResult {
  source_topic: EnrichedTopic;
  frame_analysis: SemanticFrame;
  generated_topics: {
    topic: Partial<EnrichedTopic>;
    frame_derivation: string; // How this topic was derived from the frame
    element_source: FrameElement | FrameAction;
  }[];
  bridged_eavs: SemanticTriple[]; // EAVs extracted from frame analysis
}

// ============================================================================
// MONEY PAGE 4 PILLARS
// Commercial page optimization scoring system
// ============================================================================

/**
 * The four pillars of a money page
 */
export type MoneyPagePillar = 'verbalization' | 'contextualization' | 'monetization' | 'visualization';

/**
 * Single checklist item for pillar scoring
 */
export interface PillarChecklistItem {
  id: string;
  label: string;
  description: string;
  weight: number; // Points toward pillar score (0-100)
  checked: boolean;
  category?: string; // Sub-category within pillar
}

/**
 * Score for a single pillar
 */
export interface MoneyPagePillarScore {
  pillar: MoneyPagePillar;
  score: number; // 0-100
  max_score: number;
  checklist: PillarChecklistItem[];
  suggestions: string[];
  critical_missing: string[]; // Must-have items that are missing
}

/**
 * Complete 4-pillar analysis result
 */
export interface MoneyPagePillarsResult {
  overall_score: number; // 0-100
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  pillars: MoneyPagePillarScore[];
  missing_critical: string[]; // Aggregated critical issues
  improvement_priority: MoneyPagePillar[]; // Pillars to focus on first
  recommendations: string[];
}

/**
 * Configuration for 4 Pillars analysis
 */
export interface MoneyPagePillarsConfig {
  weights: Record<MoneyPagePillar, number>; // Relative weight of each pillar
  passing_threshold: number; // Minimum score to pass (e.g., 70)
  critical_items: string[]; // Item IDs that are mandatory
}

// ============================================================================
// QUERY TEMPLATES
// Search pattern templates for Local SEO and service variations
// ============================================================================

/**
 * Category of query template
 */
export type QueryTemplateCategory = 'local' | 'comparison' | 'how-to' | 'problem-solution' | 'best-of' | 'review' | 'cost' | 'ecommerce' | 'custom';

/**
 * Single placeholder within a query template
 */
export interface TemplatePlaceholder {
  name: string; // Display name (e.g., "City")
  bracket_syntax: string; // How it appears in template (e.g., "[City]")
  entity_type: string; // Schema.org or custom type (e.g., "AdministrativeArea")
  validation_pattern?: string; // Regex for validation
  example_values: string[];
  required: boolean;
}

/**
 * Query template definition
 */
export interface QueryTemplate {
  id: string;
  name: string;
  pattern: string; // "Best [Service] in [City] for [Audience]"
  description: string;
  placeholders: TemplatePlaceholder[];
  category: QueryTemplateCategory;
  search_intent: 'informational' | 'transactional' | 'navigational' | 'commercial';
  example_output: string;
  suggested_topic_class: 'monetization' | 'informational';
}

/**
 * Location entity for Local SEO templates
 */
export interface LocationEntity {
  id: string;
  name: string;
  type: 'city' | 'region' | 'neighborhood' | 'country' | 'district';
  parent_location_id?: string;
  population?: number;
  coordinates?: { lat: number; lng: number };
  language?: string;
  country_code?: string;
}

/**
 * Variable set for template expansion
 */
export interface TemplateVariableSet {
  [placeholderName: string]: string | string[];
}

/**
 * Result of template expansion
 */
export interface ExpandedTemplateResult {
  original_template: QueryTemplate;
  variable_combinations: TemplateVariableSet[];
  generated_queries: string[];
  generated_topics: Partial<EnrichedTopic>[];
  parent_topic_id?: string;
}

/**
 * Batch expansion configuration
 */
export interface TemplateBatchConfig {
  template: QueryTemplate;
  locations?: LocationEntity[];
  services?: string[];
  audiences?: string[];
  max_combinations?: number;
  parent_topic_id?: string;
}

// ============================================================================
// VISUAL SEMANTICS
// "Pixels, Letters, and Bytes" framework implementation
// ============================================================================

/**
 * Type of visual semantic rule
 */
export type VisualSemanticRuleType = 'alt_text' | 'placement' | 'format' | 'structure' | 'file_naming' | 'semantic_html';

/**
 * Visual semantic validation rule
 */
export interface VisualSemanticRule {
  id: string;
  rule_type: VisualSemanticRuleType;
  name: string;
  description: string;
  validation_fn?: string; // Function name for programmatic validation
  weight: number; // Importance weight (0-100)
  is_critical: boolean; // Must pass for valid image
}

/**
 * Image format specification
 */
export interface ImageOptimizationSpec {
  recommended_format: 'avif' | 'webp' | 'jpeg' | 'png';
  max_width: number; // 600px standard
  max_file_size_kb: number;
  required_attributes: string[];
  semantic_html_structure: string; // figure > picture > img pattern
}

/**
 * Complete visual semantic analysis for a single image
 */
export interface VisualSemanticAnalysis {
  image_description: string;
  alt_text_recommendation: string;
  title_attribute: string;
  file_name_recommendation: string;
  placement_context: string; // Where in content this should appear
  entity_connections: string[]; // Entities this image reinforces
  format_recommendation: ImageOptimizationSpec;
  html_template: string; // Ready-to-use HTML
  figcaption_text: string;
  n_gram_match: string[]; // Image types expected from SERP analysis
  centerpiece_alignment: number; // 0-100 score for topic alignment
}

/**
 * Complete visual semantics for a content brief
 */
export interface BriefVisualSemantics {
  hero_image: VisualSemanticAnalysis;
  section_images: Record<string, VisualSemanticAnalysis>; // Keyed by section ID
  image_n_grams: string[]; // Expected image types from SERP
  total_images_recommended: number;
  visual_hierarchy: {
    above_fold: string[]; // Image IDs to show above fold
    centerpiece: string; // Primary image reinforcing main topic
    supporting: string[]; // Secondary images
  };
  brand_alignment: {
    uses_brand_colors: boolean;
    has_logo_placement: boolean;
    consistent_style: boolean;
  };
}

/**
 * Alt text validation result
 */
export interface AltTextValidationResult {
  is_valid: boolean;
  score: number; // 0-100
  issues: {
    rule_id: string;
    message: string;
    severity: 'error' | 'warning' | 'suggestion';
  }[];
  suggestions: string[];
  entity_coverage: number; // % of entities mentioned
  keyword_stuffing_detected: boolean;
}

/**
 * File naming validation result
 */
export interface FileNameValidationResult {
  is_valid: boolean;
  original_name: string;
  recommended_name: string;
  issues: string[];
  pattern_match: boolean; // Follows [entity]-[descriptor]-[context] pattern
}

/**
 * Visual semantics validation result for entire brief
 */
export interface VisualSemanticsValidationResult {
  overall_score: number; // 0-100
  hero_image_score: number;
  section_images_score: number;
  n_gram_alignment_score: number;
  centerpiece_alignment_score: number;
  issues: {
    image_id: string;
    issue_type: VisualSemanticRuleType;
    message: string;
    severity: 'error' | 'warning';
    auto_fixable: boolean;
  }[];
  recommendations: string[];
}

// ============================================================================
// SOCIAL MEDIA SIGNALS
// Based on Google Patents for Social Media & Brand Signals
// ============================================================================

/**
 * Supported social media platforms
 */
export type SocialPlatform =
  | 'linkedin'
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'pinterest'
  | 'tiktok'
  | 'github';

/**
 * Type of social signal being measured
 */
export type SocialSignalType =
  | 'profile_completeness'
  | 'entity_consistency'
  | 'topical_relevance'
  | 'engagement'
  | 'influence'
  | 'expertise'
  | 'brand_mentions';

/**
 * Brand signal categories from Google Patents
 */
export type BrandSignalCategory =
  | 'brand_mentions'      // Implied Links Patent
  | 'entity_authority'    // Agent Rank Patent
  | 'social_influence'    // Social influence determination patent
  | 'reference_queries'   // Branded search impact
  | 'entity_consistency'; // Website Representation Vectors Patent

/**
 * Social signal rule definition
 */
export interface SocialSignalRule {
  id: string;
  signal_type: SocialSignalType;
  name: string;
  description: string;
  validation_fn?: string;
  weight: number;
  is_critical: boolean;
  patent_reference?: string;
}

/**
 * Social presence score result
 */
export interface SocialPresenceScore {
  overall_score: number;
  platform_scores: Record<SocialPlatform, number>;
  signal_scores: Record<SocialSignalType, number>;
  recommendations: string[];
  kp_readiness: number; // Knowledge Panel readiness from social signals
}

// ============================================================================
// E-COMMERCE SEMANTICS
// Semantic content network patterns for e-commerce sites
// ============================================================================

/**
 * Semantic modifier types for e-commerce
 */
export type EcommerceSemanticModifierType =
  | 'season'
  | 'material'
  | 'age_group'
  | 'gender'
  | 'size'
  | 'color'
  | 'style'
  | 'price_range'
  | 'use_case'
  | 'brand'
  | 'certification'
  | 'audience';

/**
 * Contextual hierarchy level for e-commerce
 */
export interface EcommerceHierarchyLevel {
  level: number; // 1 = Parent Category, 2 = Semantic Hub, 3 = Context Page, 4 = Product
  title: string;
  modifiers: EcommerceSemanticModifierType[];
  parent_id?: string;
}

/**
 * Query processing pattern for e-commerce
 */
export interface EcommerceQueryPattern {
  id: string;
  pattern: string;
  intent: 'informational' | 'transactional' | 'commercial' | 'navigational';
  modifiers: EcommerceSemanticModifierType[];
  topic_class: 'monetization' | 'informational';
}

/**
 * Rare attribute for SEO differentiation
 */
export interface EcommerceRareAttribute {
  id: string;
  category: string;
  attribute: string;
  seo_value: 'high' | 'medium' | 'low';
  differentiator: boolean;
}

/**
 * Interlinking rule for e-commerce semantic network
 */
export interface EcommerceInterlinkingRule {
  link_type: 'parent' | 'child' | 'sibling' | 'cross-contextual';
  anchor_pattern: string;
  weight: number;
}

/**
 * Contextual coverage assessment for e-commerce content
 */
export interface EcommerceContextualCoverage {
  category: string;
  covered_items: string[];
  total_items: number;
  coverage_score: number;
  missing_critical: string[];
}
