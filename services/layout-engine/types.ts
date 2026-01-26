/**
 * Layout Engine Types
 *
 * Comprehensive types for the intelligent layout engine that transforms
 * content briefs into visual layouts based on semantic weight, brand DNA,
 * and SEO best practices.
 */

import { AttributeCategory, BriefSection, FormatCode } from '../../types';
import { DesignDNA } from '../../types/designDna';

// =============================================================================
// CONTENT TYPE & SEMANTIC WEIGHT
// =============================================================================

/**
 * Content type detected from section analysis
 */
export type ContentType =
  | 'introduction'
  | 'explanation'
  | 'steps'
  | 'faq'
  | 'comparison'
  | 'summary'
  | 'testimonial'
  | 'definition'
  | 'list'
  | 'data';

/**
 * Factors that contribute to semantic weight calculation
 */
export interface SemanticWeightFactors {
  baseWeight: number;
  topicCategoryBonus: number;
  coreTopicBonus: number;
  fsTargetBonus: number;
  mainIntentBonus: number;
  totalWeight: number;
}

/**
 * Constraints for a section's layout
 */
export interface SectionConstraints {
  minWordCount?: number;
  maxWordCount?: number;
  requiresVisual?: boolean;
  requiresTable?: boolean;
  requiresList?: boolean;
  fsTarget?: boolean;
  paaTarget?: boolean;
}

/**
 * Complete analysis result for a single section
 */
export interface SectionAnalysis {
  sectionId: string;
  heading: string;
  headingLevel: number;
  contentType: ContentType;
  semanticWeight: number;
  semanticWeightFactors: SemanticWeightFactors;
  attributeCategory?: AttributeCategory;
  formatCode?: FormatCode;
  constraints: SectionConstraints;
  wordCount: number;
  hasTable: boolean;
  hasList: boolean;
  hasQuote: boolean;
  hasImage: boolean;
  isCoreTopic: boolean;
  answersMainIntent: boolean;
  contentZone: 'MAIN' | 'SUPPLEMENTARY';
}

// =============================================================================
// LAYOUT PARAMETERS
// =============================================================================

/**
 * Width options for layout
 */
export type LayoutWidth = 'narrow' | 'medium' | 'wide' | 'full';

/**
 * Column layout options
 */
export type ColumnLayout = '1-column' | '2-column' | '3-column' | 'asymmetric-left' | 'asymmetric-right';

/**
 * Image position options
 */
export type ImagePosition = 'left' | 'right' | 'above' | 'below' | 'background' | 'inline' | 'none';

/**
 * Vertical spacing between sections
 */
export type VerticalSpacing = 'tight' | 'normal' | 'generous' | 'dramatic';

/**
 * Break type for page flow
 */
export type BreakType = 'none' | 'soft' | 'hard';

/**
 * Layout parameters for a section
 */
export interface LayoutParameters {
  width: LayoutWidth;
  columns: ColumnLayout;
  imagePosition: ImagePosition;
  verticalSpacingBefore: VerticalSpacing;
  verticalSpacingAfter: VerticalSpacing;
  breakBefore: BreakType;
  breakAfter: BreakType;
  alignText: 'left' | 'center' | 'justify';
  maxContentWidth?: string;
}

// =============================================================================
// VISUAL EMPHASIS
// =============================================================================

/**
 * Level of visual emphasis
 */
export type EmphasisLevel = 'minimal' | 'subtle' | 'moderate' | 'strong' | 'hero';

/**
 * Visual emphasis configuration
 */
export interface VisualEmphasis {
  level: EmphasisLevel;
  useBackgroundColor: boolean;
  useBorder: boolean;
  useAccentColor: boolean;
  useDropShadow: boolean;
  useGradient: boolean;
  useIcon: boolean;
  iconSuggestion?: string;
}

// =============================================================================
// COMPONENT SELECTION
// =============================================================================

/**
 * Available component types for sections
 */
export type ComponentType =
  | 'prose'
  | 'card'
  | 'hero'
  | 'feature-grid'
  | 'accordion'
  | 'timeline'
  | 'comparison-table'
  | 'testimonial-card'
  | 'key-takeaways'
  | 'cta-banner'
  | 'step-list'
  | 'checklist'
  | 'stat-highlight'
  | 'blockquote'
  | 'definition-box'
  | 'faq-accordion';

/**
 * Component selection result
 */
export interface ComponentSelection {
  primaryComponent: ComponentType;
  alternativeComponents: ComponentType[];
  componentVariant?: string;
  confidence: number;
  reasoning: string;
}

// =============================================================================
// IMAGE PLACEMENT
// =============================================================================

/**
 * Image placement configuration
 */
export interface ImagePlacement {
  position: ImagePosition;
  size: 'small' | 'medium' | 'large' | 'full';
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | 'auto';
  wrapText: boolean;
  caption?: boolean;
  lazyLoad: boolean;
  priority: 'high' | 'medium' | 'low';
}

// =============================================================================
// LAYOUT SUGGESTION
// =============================================================================

/**
 * Complete layout suggestion for a section
 */
export interface LayoutSuggestion {
  sectionAnalysis: SectionAnalysis;
  layoutParameters: LayoutParameters;
  visualEmphasis: VisualEmphasis;
  componentSelection: ComponentSelection;
  imagePlacement?: ImagePlacement;
}

// =============================================================================
// BLUEPRINT
// =============================================================================

/**
 * Single section in the layout blueprint
 */
export interface BlueprintSection {
  id: string;
  order: number;
  heading: string;
  headingLevel: number;
  contentType: ContentType;
  semanticWeight: number;
  layout: LayoutParameters;
  emphasis: VisualEmphasis;
  component: ComponentSelection;
  image?: ImagePlacement;
  constraints: SectionConstraints;
  contentZone: 'MAIN' | 'SUPPLEMENTARY';
  cssClasses: string[];
  customStyles?: Record<string, string>;
}

/**
 * Complete layout blueprint for an article
 */
export interface LayoutBlueprint {
  id: string;
  articleId: string;
  createdAt: string;
  version: number;
  sections: BlueprintSection[];
  globalSettings: {
    defaultWidth: LayoutWidth;
    defaultSpacing: VerticalSpacing;
    primaryFont: string;
    secondaryFont: string;
    colorScheme: 'light' | 'dark' | 'auto';
  };
  designDnaHash?: string;
  metadata: {
    totalSections: number;
    mainSectionCount: number;
    supplementarySectionCount: number;
    averageSemanticWeight: number;
    heroSectionId?: string;
  };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Input for semantic weight calculation
 */
export interface SemanticWeightInput {
  attributeCategory?: AttributeCategory;
  isCoreTopic?: boolean;
  hasFSTarget?: boolean;
  answersMainIntent?: boolean;
}

/**
 * Input for section analysis
 */
export interface SectionAnalysisInput {
  sectionId: string;
  content: string;
  briefSection?: BriefSection;
  topicTitle?: string;
  isCoreTopic?: boolean;
  mainIntent?: string;
}

/**
 * Analyzed content result from raw markdown/HTML
 */
export interface AnalyzedContent {
  sections: Array<{
    id: string;
    heading: string;
    headingLevel: number;
    content: string;
    wordCount: number;
    hasTable: boolean;
    hasList: boolean;
    hasQuote: boolean;
    hasImage: boolean;
  }>;
  totalWordCount: number;
  estimatedReadTime: number;
}

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

/**
 * Section analyzer service interface
 */
export interface ISectionAnalyzer {
  analyzeSection(input: SectionAnalysisInput): SectionAnalysis;
  analyzeAllSections(
    content: string,
    briefSections?: BriefSection[],
    options?: { topicTitle?: string; isCoreTopic?: boolean; mainIntent?: string }
  ): SectionAnalysis[];
  calculateSemanticWeight(input: SemanticWeightInput): number;
  detectContentType(heading: string, content: string, formatCode?: FormatCode): ContentType;
}

/**
 * Layout planner service interface
 */
export interface ILayoutPlanner {
  planLayout(analysis: SectionAnalysis, designDna?: DesignDNA): LayoutParameters;
  planAllLayouts(analyses: SectionAnalysis[], designDna?: DesignDNA): LayoutParameters[];
}

/**
 * Component selector service interface
 */
export interface IComponentSelector {
  selectComponent(analysis: SectionAnalysis, designDna?: DesignDNA): ComponentSelection;
  selectAllComponents(analyses: SectionAnalysis[], designDna?: DesignDNA): ComponentSelection[];
}

/**
 * Visual emphasizer service interface
 */
export interface IVisualEmphasizer {
  determineEmphasis(analysis: SectionAnalysis, designDna?: DesignDNA): VisualEmphasis;
  determineAllEmphasis(analyses: SectionAnalysis[], designDna?: DesignDNA): VisualEmphasis[];
}

/**
 * Image handler service interface
 */
export interface IImageHandler {
  determineImagePlacement(analysis: SectionAnalysis, designDna?: DesignDNA): ImagePlacement | undefined;
  determineAllImagePlacements(analyses: SectionAnalysis[], designDna?: DesignDNA): (ImagePlacement | undefined)[];
}

/**
 * Layout engine orchestrator interface
 */
export interface ILayoutEngine {
  generateBlueprint(
    content: string,
    briefSections?: BriefSection[],
    designDna?: DesignDNA,
    options?: {
      topicTitle?: string;
      isCoreTopic?: boolean;
      mainIntent?: string;
    }
  ): LayoutBlueprint;
}
