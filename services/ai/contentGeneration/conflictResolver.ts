/**
 * Conflict Resolver Module
 *
 * Detects and resolves conflicts between content briefs and templates.
 * Provides SEO-based reasoning for resolution recommendations.
 *
 * Key features:
 * - Detects format code mismatches between brief sections and template sections
 * - Rates severity (critical for FS, moderate for TABLE/PAA/LISTING, minor for PROSE/DEFINITIVE)
 * - Generates AI recommendations with SEO reasoning
 * - Applies resolution based on user choice (template, brief, or merge)
 *
 * @module services/ai/contentGeneration/conflictResolver
 */

import { TemplateConfig, ConflictItem, ConflictDetectionResult, SectionTemplate } from '../../../types/contentTemplates';
import { FormatCode, ContentBrief, BriefSection } from '../../../types/content';

// ============================================================================
// TYPES
// ============================================================================

/**
 * User's choice for conflict resolution
 */
export type ResolutionChoice = 'template' | 'brief' | 'merge';

/**
 * Resolution result with applied format codes
 */
export interface ResolutionResult {
  formatCodes: Record<string, FormatCode | string>;
  appliedChoice: ResolutionChoice;
  changesApplied: number;
}

// ============================================================================
// SEVERITY RATING
// ============================================================================

/**
 * Get severity rating for a format code conflict
 * Critical: FS (Featured Snippet opportunity)
 * Moderate: TABLE, PAA, LISTING (structured data opportunities)
 * Minor: PROSE differences or matching categories
 */
function getFormatCodeSeverity(
  briefValue: string,
  templateValue: FormatCode
): 'minor' | 'moderate' | 'critical' {
  // Critical: Missing FS opportunity
  if (templateValue === FormatCode.FS && briefValue !== 'FS') {
    return 'critical';
  }

  // Moderate: Missing TABLE, PAA, or LISTING opportunity
  // LISTING is moderate because structured lists improve scannability
  // and can trigger list-style featured snippets
  if (
    (templateValue === FormatCode.TABLE ||
      templateValue === FormatCode.PAA ||
      templateValue === FormatCode.LISTING) &&
    briefValue !== String(templateValue)
  ) {
    return 'moderate';
  }

  // Minor: PROSE or DEFINITIVE differences
  return 'minor';
}

/**
 * Get overall severity from multiple conflicts
 */
function getOverallSeverity(
  conflicts: ConflictItem[]
): 'minor' | 'moderate' | 'critical' {
  if (conflicts.some((c) => c.severity === 'critical')) {
    return 'critical';
  }
  if (conflicts.some((c) => c.severity === 'moderate')) {
    return 'moderate';
  }
  return 'minor';
}

// ============================================================================
// SEO ARGUMENTS
// ============================================================================

/**
 * Generate SEO argument explaining why template format is preferred
 */
export function generateSeoArgument(
  field: string,
  briefValue: unknown,
  templateValue: unknown
): string {
  if (field !== 'formatCode') {
    return `Template value "${templateValue}" is optimized for this content type.`;
  }

  const templateFormat = String(templateValue);

  switch (templateFormat) {
    case 'FS':
      return `Featured Snippet optimization: Using FS (Featured Snippet) format increases the chance of appearing in Google's position-zero results. The concise, direct-answer format is specifically designed to match how Google extracts featured snippets from content.`;

    case 'PAA':
      return `People Also Ask optimization: Using PAA format structures content as questions and answers, increasing visibility in Google's "People Also Ask" boxes. This accordion-style format directly maps to how Google displays related questions.`;

    case 'TABLE':
      return `Structured data optimization: Using TABLE format enables rich snippets and improves scannability. Google can extract tabular data for featured snippets and comparison cards, especially for specifications and comparisons.`;

    case 'LISTING':
      return `List format optimization: Using LISTING format improves scannability and enables list-style featured snippets. Numbered or bulleted lists are preferred by Google for step-by-step processes and feature highlights.`;

    case 'DEFINITIVE':
      return `Authoritative definition format: Using DEFINITIVE format signals encyclopedic authority to search engines. This format is optimal for knowledge panel integration and definitional queries.`;

    case 'PROSE':
      return `Narrative format: Using PROSE format provides flexibility for detailed explanations. While less structured, it allows for comprehensive coverage of complex topics.`;

    default:
      return `Template format "${templateValue}" is optimized for this content type and search intent.`;
  }
}

// ============================================================================
// HEADING MATCHING
// ============================================================================

/**
 * Normalize heading for comparison (lowercase, remove entity placeholders)
 */
function normalizeHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/\{entity\}/g, '')
    .replace(/[?:]/g, '')
    .trim();
}

/**
 * Find matching template section for a brief section
 */
function findMatchingTemplateSection(
  briefHeading: string,
  templateSections: SectionTemplate[]
): SectionTemplate | undefined {
  const normalizedBrief = normalizeHeading(briefHeading);

  // Look for keyword matches
  for (const section of templateSections) {
    const normalizedTemplate = normalizeHeading(section.headingPattern);

    // Check for common keywords
    const templateKeywords = normalizedTemplate.split(/\s+/).filter((w) => w.length > 3);
    const briefKeywords = normalizedBrief.split(/\s+/).filter((w) => w.length > 3);

    // Check if any significant keywords match
    const hasMatch = templateKeywords.some((tk) =>
      briefKeywords.some((bk) => bk.includes(tk) || tk.includes(bk))
    );

    if (hasMatch) {
      return section;
    }
  }

  return undefined;
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Detect conflicts between template and brief
 * Compares brief sections with template sections to find format code mismatches
 */
export function detectConflicts(
  template: TemplateConfig,
  brief: Partial<ContentBrief>
): ConflictDetectionResult {
  const conflicts: ConflictItem[] = [];

  if (!brief.structured_outline || brief.structured_outline.length === 0) {
    return {
      hasConflicts: false,
      conflicts: [],
      overallSeverity: 'minor',
      aiRecommendation: {
        action: 'use-template',
        reasoning: ['No sections in brief to compare'],
      },
    };
  }

  // Check each brief section against template
  for (const briefSection of brief.structured_outline) {
    const matchingTemplateSection = findMatchingTemplateSection(
      briefSection.heading,
      template.sectionStructure
    );

    if (matchingTemplateSection) {
      const briefFormatCode = briefSection.format_code
        ? String(briefSection.format_code)
        : undefined;
      const templateFormatCode = matchingTemplateSection.formatCode;

      // Check for format code mismatch
      if (briefFormatCode && briefFormatCode !== String(templateFormatCode)) {
        const severity = getFormatCodeSeverity(briefFormatCode, templateFormatCode);
        const seoArgument = generateSeoArgument(
          'formatCode',
          briefFormatCode,
          templateFormatCode
        );

        conflicts.push({
          field: 'formatCode',
          briefValue: briefFormatCode,
          templateValue: templateFormatCode,
          severity,
          semanticSeoArgument: seoArgument,
        });
      }
    }
  }

  // Determine overall severity
  const overallSeverity = conflicts.length > 0 ? getOverallSeverity(conflicts) : 'minor';

  // Generate AI recommendation
  const aiRecommendation = generateAiRecommendation(conflicts, template);

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    overallSeverity,
    aiRecommendation,
  };
}

/**
 * Generate AI recommendation based on detected conflicts
 */
function generateAiRecommendation(
  conflicts: ConflictItem[],
  template: TemplateConfig
): ConflictDetectionResult['aiRecommendation'] {
  if (conflicts.length === 0) {
    return {
      action: 'use-template',
      reasoning: ['No conflicts detected between brief and template'],
    };
  }

  const hasCritical = conflicts.some((c) => c.severity === 'critical');
  const hasModerate = conflicts.some((c) => c.severity === 'moderate');

  if (hasCritical) {
    return {
      action: 'use-template',
      reasoning: [
        'Critical SEO opportunity detected: Template format codes are optimized for Featured Snippet capture',
        `Template "${template.label}" has been designed for maximum search visibility`,
        'Using template format codes will improve chances of ranking in position zero',
      ],
    };
  }

  if (hasModerate) {
    return {
      action: 'use-template',
      reasoning: [
        'Structured data opportunities detected in template format codes',
        'Template sections use formats optimized for rich snippets and PAA boxes',
        'Recommend using template for better SERP feature visibility',
      ],
    };
  }

  // Minor conflicts - still recommend template but less strongly
  return {
    action: 'use-template',
    reasoning: [
      'Minor formatting differences detected',
      'Template format codes follow SEO best practices for this content type',
      'Using template ensures consistency with proven content structure',
    ],
  };
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve conflicts by applying user's choice
 */
export function resolveConflicts(
  detection: ConflictDetectionResult,
  userChoice: ResolutionChoice,
  template: TemplateConfig,
  brief: Partial<ContentBrief>
): ResolutionResult {
  const formatCodes: Record<string, FormatCode | string> = {};
  let changesApplied = 0;

  if (!brief.structured_outline) {
    return {
      formatCodes,
      appliedChoice: userChoice,
      changesApplied: 0,
    };
  }

  // Build format codes based on user choice
  for (const briefSection of brief.structured_outline) {
    const matchingTemplateSection = findMatchingTemplateSection(
      briefSection.heading,
      template.sectionStructure
    );

    if (matchingTemplateSection) {
      const briefFormatCode = briefSection.format_code
        ? String(briefSection.format_code)
        : undefined;
      const templateFormatCode = matchingTemplateSection.formatCode;

      if (userChoice === 'template') {
        // Use template values
        formatCodes[briefSection.heading] = templateFormatCode;
        if (briefFormatCode && briefFormatCode !== String(templateFormatCode)) {
          changesApplied++;
        }
      } else if (userChoice === 'brief') {
        // Keep brief values
        formatCodes[briefSection.heading] = briefFormatCode || templateFormatCode;
      } else {
        // Merge: use template for critical/moderate, brief for minor
        const conflict = detection.conflicts.find(
          (c) =>
            c.briefValue === briefFormatCode &&
            String(c.templateValue) === String(templateFormatCode)
        );

        if (conflict && (conflict.severity === 'critical' || conflict.severity === 'moderate')) {
          formatCodes[briefSection.heading] = templateFormatCode;
          changesApplied++;
        } else {
          formatCodes[briefSection.heading] = briefFormatCode || templateFormatCode;
        }
      }
    } else {
      // No matching template section, keep brief value
      if (briefSection.format_code) {
        formatCodes[briefSection.heading] = String(briefSection.format_code);
      }
    }
  }

  return {
    formatCodes,
    appliedChoice: userChoice,
    changesApplied,
  };
}
