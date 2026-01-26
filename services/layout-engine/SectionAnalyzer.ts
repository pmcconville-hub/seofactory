/**
 * SectionAnalyzer
 *
 * Analyzes content sections to calculate semantic weight and detect content types.
 * This is the foundation for the intelligent layout engine, providing data
 * for LayoutPlanner, ComponentSelector, VisualEmphasizer, and ImageHandler.
 */

import { AttributeCategory, BriefSection, FormatCode } from '../../types';
import {
  ContentType,
  ISectionAnalyzer,
  SectionAnalysis,
  SectionAnalysisInput,
  SectionConstraints,
  SemanticWeightFactors,
  SemanticWeightInput,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const BASE_WEIGHT = 3;
const MAX_WEIGHT = 5;
const MIN_WEIGHT = 1;

const CATEGORY_BONUSES: Record<AttributeCategory, number> = {
  UNIQUE: 2,
  RARE: 1,
  ROOT: 0.5,
  COMMON: 0,
  CORE_DEFINITION: 0.5,
  SEARCH_DEMAND: 0.5,
  COMPETITIVE_EXPANSION: 0.25,
  COMPOSITE: 0.25,
  UNCLASSIFIED: 0,
};

const CORE_TOPIC_BONUS = 0.5;
const FS_TARGET_BONUS = 0.5;
const MAIN_INTENT_BONUS = 0.5;

// =============================================================================
// HEADING PATTERNS
// =============================================================================

const INTRODUCTION_PATTERNS = [
  /^introduction$/i,
  /^overview/i,
  /^getting\s+started/i,
  /^what\s+you('ll)?\s+(need|learn)/i,
  /^about\s+this/i,
];

const FAQ_PATTERNS = [
  /^faq/i,
  /^frequently\s+asked/i,
  /^common\s+questions/i,
  /^q\s*&\s*a/i,
];

const COMPARISON_PATTERNS = [
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\bcomparison\b/i,
  /\bcomparing\b/i,
  /\bdifference(s)?\s+between\b/i,
  /\bpros\s+(and|&)\s+cons\b/i,
];

const SUMMARY_PATTERNS = [
  /^summary$/i,
  /^conclusion/i,
  /^final\s+thoughts/i,
  /^wrap(\s|-)?up/i,
  /^key\s+takeaways/i,
  /^in\s+summary/i,
];

const DEFINITION_PATTERNS = [
  /^what\s+is\b/i,
  /^what\s+are\b/i,
  /^definition\s+of/i,
  /^meaning\s+of/i,
  /^understanding\b/i,
];

const STEPS_PATTERNS = [
  /^how\s+to\b/i,
  /^step(\s|-)?by(\s|-)?step/i,
  /^guide\s+to/i,
  /^tutorial/i,
  /\bprocess\b/i,
];

const TESTIMONIAL_PATTERNS = [
  /^testimonial/i,
  /^review/i,
  /^customer\s+(stories|feedback)/i,
  /^what\s+(people|customers|users)\s+say/i,
];

// =============================================================================
// CONTENT DETECTION PATTERNS
// =============================================================================

const ORDERED_LIST_PATTERN = /^\s*\d+\.\s+/m;
const UNORDERED_LIST_PATTERN = /^\s*[-*+]\s+/m;
const TABLE_PATTERN = /\|.*\|.*\n\s*\|[-:|\s]+\|/;
const QUOTE_PATTERN = /^\s*>/m;
const IMAGE_PATTERN = /!\[.*?\]\(.*?\)|<img\s/;
const HTML_LIST_PATTERN = /<[ou]l[\s>]/i;
const HTML_TABLE_PATTERN = /<table[\s>]/i;
const HTML_QUOTE_PATTERN = /<blockquote[\s>]/i;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function extractHeading(content: string): { heading: string; level: number } {
  // Match markdown headings
  const mdMatch = content.match(/^(#{1,6})\s+(.+?)(?:\n|$)/m);
  if (mdMatch) {
    return {
      heading: mdMatch[2].trim(),
      level: mdMatch[1].length,
    };
  }

  // Match HTML headings
  const htmlMatch = content.match(/<h([1-6])[^>]*>(.+?)<\/h\1>/i);
  if (htmlMatch) {
    return {
      heading: htmlMatch[2].replace(/<[^>]+>/g, '').trim(),
      level: parseInt(htmlMatch[1], 10),
    };
  }

  return { heading: '', level: 0 };
}

function countWords(text: string): number {
  // Remove HTML tags and markdown formatting
  const cleaned = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function normalizeHeading(heading: string, briefHeading?: string): string {
  // Use brief heading if provided and current heading is empty
  if (!heading && briefHeading) {
    return briefHeading;
  }
  return heading;
}

function normalizeForComparison(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function headingSimilarityScore(heading1: string, heading2: string): number {
  const n1 = normalizeForComparison(heading1);
  const n2 = normalizeForComparison(heading2);

  // Exact match
  if (n1 === n2) return 1.0;

  // One contains the other (full containment)
  if (n1 === n2) return 1.0;

  // Word-level analysis
  const words1 = n1.split(' ').filter((w) => w.length > 0);
  const words2 = n2.split(' ').filter((w) => w.length > 0);

  // Check word-by-word exact match
  if (words1.length === words2.length && words1.every((w, i) => w === words2[i])) {
    return 1.0;
  }

  // Calculate overlap score
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const overlap = [...set1].filter((w) => set2.has(w)).length;
  const total = Math.max(set1.size, set2.size);

  if (total === 0) return 0;

  // Return overlap ratio (0 to 1)
  return overlap / total;
}

function headingSimilarity(heading1: string, heading2: string): boolean {
  return headingSimilarityScore(heading1, heading2) >= 0.7;
}

// =============================================================================
// SECTION ANALYZER CLASS
// =============================================================================

export class SectionAnalyzer implements ISectionAnalyzer {
  /**
   * Calculate semantic weight based on various factors
   * Returns a value between 1 and 5
   */
  static calculateSemanticWeight(input: SemanticWeightInput): number {
    let weight = BASE_WEIGHT;

    // Topic category bonus
    if (input.attributeCategory) {
      weight += CATEGORY_BONUSES[input.attributeCategory] || 0;
    }

    // Core topic bonus
    if (input.isCoreTopic) {
      weight += CORE_TOPIC_BONUS;
    }

    // Featured Snippet target bonus
    if (input.hasFSTarget) {
      weight += FS_TARGET_BONUS;
    }

    // Answers main intent bonus
    if (input.answersMainIntent) {
      weight += MAIN_INTENT_BONUS;
    }

    // Clamp to valid range
    return Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));
  }

  /**
   * Detect content type from heading and content
   */
  static detectContentType(
    heading: string,
    content: string,
    formatCode?: FormatCode
  ): ContentType {
    const headingLower = heading.toLowerCase();

    // Check format code first (highest priority)
    if (formatCode) {
      switch (formatCode) {
        case 'LISTING':
          return 'steps';
        case 'TABLE':
          return 'comparison';
        case 'DEFINITIVE':
          return 'definition';
        case 'FS':
          // FS doesn't dictate type, continue detection
          break;
        case 'PAA':
          return 'faq';
      }
    }

    // Check heading patterns
    if (matchesAnyPattern(heading, INTRODUCTION_PATTERNS)) {
      return 'introduction';
    }
    if (matchesAnyPattern(heading, FAQ_PATTERNS)) {
      return 'faq';
    }
    if (matchesAnyPattern(heading, COMPARISON_PATTERNS)) {
      return 'comparison';
    }
    if (matchesAnyPattern(heading, SUMMARY_PATTERNS)) {
      return 'summary';
    }
    if (matchesAnyPattern(heading, DEFINITION_PATTERNS)) {
      return 'definition';
    }
    if (matchesAnyPattern(heading, STEPS_PATTERNS)) {
      return 'steps';
    }
    if (matchesAnyPattern(heading, TESTIMONIAL_PATTERNS)) {
      return 'testimonial';
    }

    // Check content patterns
    // Table detection (comparison)
    if (TABLE_PATTERN.test(content) || HTML_TABLE_PATTERN.test(content)) {
      return 'comparison';
    }

    // Ordered list detection (steps)
    if (
      ORDERED_LIST_PATTERN.test(content) ||
      (HTML_LIST_PATTERN.test(content) && content.includes('<ol'))
    ) {
      return 'steps';
    }

    // Unordered list detection
    if (
      UNORDERED_LIST_PATTERN.test(content) ||
      (HTML_LIST_PATTERN.test(content) && content.includes('<ul'))
    ) {
      return 'list';
    }

    // Default to explanation
    return 'explanation';
  }

  /**
   * Analyze a single section
   */
  static analyzeSection(input: SectionAnalysisInput): SectionAnalysis {
    const { sectionId, content, briefSection, isCoreTopic, mainIntent } = input;

    // Extract heading from content
    const { heading: extractedHeading, level: headingLevel } = extractHeading(content);
    const heading = normalizeHeading(extractedHeading, briefSection?.heading);

    // Get format code and attribute category from brief section
    const formatCode = briefSection?.format_code;
    const attributeCategory = briefSection?.attribute_category;
    const contentZone = briefSection?.content_zone || 'MAIN';

    // Detect content type
    const contentType = SectionAnalyzer.detectContentType(heading, content, formatCode);

    // Check if this section answers the main intent
    const answersMainIntent = mainIntent
      ? headingSimilarity(heading, mainIntent) ||
        heading.toLowerCase().includes(mainIntent.toLowerCase())
      : false;

    // Determine if this has FS target
    const hasFSTarget = formatCode === 'FS';

    // Calculate semantic weight
    const weightInput: SemanticWeightInput = {
      attributeCategory,
      isCoreTopic: isCoreTopic || false,
      hasFSTarget,
      answersMainIntent,
    };

    const semanticWeight = SectionAnalyzer.calculateSemanticWeight(weightInput);

    // Calculate weight factors for debugging/transparency
    const semanticWeightFactors: SemanticWeightFactors = {
      baseWeight: BASE_WEIGHT,
      topicCategoryBonus: attributeCategory ? CATEGORY_BONUSES[attributeCategory] || 0 : 0,
      coreTopicBonus: isCoreTopic ? CORE_TOPIC_BONUS : 0,
      fsTargetBonus: hasFSTarget ? FS_TARGET_BONUS : 0,
      mainIntentBonus: answersMainIntent ? MAIN_INTENT_BONUS : 0,
      totalWeight: semanticWeight,
    };

    // Detect content features
    const hasTable = TABLE_PATTERN.test(content) || HTML_TABLE_PATTERN.test(content);
    const hasList =
      UNORDERED_LIST_PATTERN.test(content) ||
      ORDERED_LIST_PATTERN.test(content) ||
      HTML_LIST_PATTERN.test(content);
    const hasQuote = QUOTE_PATTERN.test(content) || HTML_QUOTE_PATTERN.test(content);
    const hasImage = IMAGE_PATTERN.test(content);

    // Word count
    const wordCount = countWords(content);

    // Build constraints from brief section
    const constraints: SectionConstraints = {
      fsTarget: hasFSTarget,
      paaTarget: formatCode === 'PAA',
      requiresTable: formatCode === 'TABLE',
      requiresList: formatCode === 'LISTING',
    };

    return {
      sectionId,
      heading,
      headingLevel,
      contentType,
      semanticWeight,
      semanticWeightFactors,
      attributeCategory,
      formatCode,
      constraints,
      wordCount,
      hasTable,
      hasList,
      hasQuote,
      hasImage,
      isCoreTopic: isCoreTopic || false,
      answersMainIntent,
      contentZone,
    };
  }

  /**
   * Analyze all sections in a markdown/HTML document
   */
  static analyzeAllSections(
    content: string,
    briefSections?: BriefSection[],
    options?: {
      topicTitle?: string;
      isCoreTopic?: boolean;
      mainIntent?: string;
    }
  ): SectionAnalysis[] {
    if (!content || !content.trim()) {
      return [];
    }

    // Split content into sections by headings
    const sections = SectionAnalyzer.splitIntoSections(content);

    if (sections.length === 0) {
      return [];
    }

    // Track which brief sections have been matched to avoid duplicates
    const usedBriefIndices = new Set<number>();

    // Analyze each section
    return sections.map((section, index) => {
      // Try to match with brief section (with tracking to avoid duplicates)
      const briefSection = briefSections
        ? SectionAnalyzer.findBestMatchingBriefSection(
            section.heading,
            briefSections,
            usedBriefIndices
          )
        : undefined;

      return SectionAnalyzer.analyzeSection({
        sectionId: `section-${index}`,
        content: section.content,
        briefSection,
        topicTitle: options?.topicTitle,
        isCoreTopic: options?.isCoreTopic,
        mainIntent: options?.mainIntent,
      });
    });
  }

  /**
   * Split content into sections based on headings
   */
  private static splitIntoSections(
    content: string
  ): Array<{ heading: string; content: string }> {
    const sections: Array<{ heading: string; content: string }> = [];

    // Match headings (markdown and HTML)
    const headingRegex = /(?:^|\n)(#{1,6}\s+.+?(?:\n|$)|<h[1-6][^>]*>.*?<\/h[1-6]>)/gi;
    const matches = [...content.matchAll(headingRegex)];

    if (matches.length === 0) {
      // No headings found - treat entire content as one section
      if (content.trim()) {
        sections.push({ heading: '', content: content.trim() });
      }
      return sections;
    }

    // Process each heading and its content
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const startIndex = match.index || 0;
      const endIndex = matches[i + 1]?.index || content.length;

      const sectionContent = content.slice(startIndex, endIndex).trim();
      const { heading } = extractHeading(sectionContent);

      sections.push({
        heading,
        content: sectionContent,
      });
    }

    return sections;
  }

  /**
   * Find the best matching brief section, tracking used indices
   */
  private static findBestMatchingBriefSection(
    heading: string,
    briefSections: BriefSection[],
    usedIndices: Set<number>
  ): BriefSection | undefined {
    if (!heading) return undefined;

    let bestMatch: { index: number; score: number } | null = null;

    for (let i = 0; i < briefSections.length; i++) {
      if (usedIndices.has(i)) continue;

      const bs = briefSections[i];
      const score = Math.max(
        headingSimilarityScore(heading, bs.heading),
        bs.section_heading ? headingSimilarityScore(heading, bs.section_heading) : 0
      );

      // Require high similarity (0.7+) and track best match
      if (score >= 0.7 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { index: i, score };
      }
    }

    if (bestMatch) {
      usedIndices.add(bestMatch.index);
      return briefSections[bestMatch.index];
    }

    return undefined;
  }

  /**
   * Find a brief section that matches the given heading (legacy, no tracking)
   */
  private static findMatchingBriefSection(
    heading: string,
    briefSections: BriefSection[]
  ): BriefSection | undefined {
    if (!heading) return undefined;

    return briefSections.find(
      (bs) =>
        headingSimilarity(heading, bs.heading) ||
        (bs.section_heading && headingSimilarity(heading, bs.section_heading))
    );
  }

  // Instance methods that delegate to static methods
  calculateSemanticWeight(input: SemanticWeightInput): number {
    return SectionAnalyzer.calculateSemanticWeight(input);
  }

  detectContentType(heading: string, content: string, formatCode?: FormatCode): ContentType {
    return SectionAnalyzer.detectContentType(heading, content, formatCode);
  }

  analyzeSection(input: SectionAnalysisInput): SectionAnalysis {
    return SectionAnalyzer.analyzeSection(input);
  }

  analyzeAllSections(
    content: string,
    briefSections?: BriefSection[],
    options?: {
      topicTitle?: string;
      isCoreTopic?: boolean;
      mainIntent?: string;
    }
  ): SectionAnalysis[] {
    return SectionAnalyzer.analyzeAllSections(content, briefSections, options);
  }
}

export default SectionAnalyzer;
