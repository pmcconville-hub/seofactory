/**
 * Content Analyzer Service
 *
 * Provides comprehensive analysis of content briefs and generated content.
 * Used for debugging quality issues and understanding what went wrong.
 *
 * Features:
 * - Brief analysis: What fields were populated vs empty
 * - Output analysis: Word count, sections, images, links
 * - Comparison: Brief requirements vs actual output
 * - Duplicate detection: Find repeated content across sections
 * - Pass-by-pass analysis: Track quality changes through generation
 *
 * Created: January 13, 2026
 */

import {
  ContentBrief,
  ContentGenerationJob,
  ContentGenerationSection,
} from '../types';
import { evaluateStrategy } from './contentStrategyEnforcer';
import { enforceContentRules } from './contentRuleEnforcer';

// =============================================================================
// Types
// =============================================================================

export interface BriefAnalysisSummary {
  title: string;
  targetKeyword: string;
  targetWordCount: number | null;
  searchIntent: string | null;
  sectionCount: number;
  visualSemanticsCount: number;
  ctaPresent: boolean;
  internalLinksCount: number;
  competitorSpecsQuality: string;
  /** Fields that have meaningful data */
  populatedFields: string[];
  /** Fields that are empty or missing */
  emptyFields: string[];
  /** Overall brief completeness score (0-100) */
  completenessScore: number;
}

export interface OutputAnalysisSummary {
  wordCount: number;
  sectionCount: number;
  imageCount: number;
  internalLinkCount: number;
  ctaFound: boolean;
  /** Whether duplicate content was detected across sections */
  duplicateContentDetected: boolean;
  /** Section keys that have duplicate content */
  duplicateSections: string[];
  /** Duplicate image descriptions */
  duplicateImages: string[];
  /** Heading structure analysis */
  headingStructure: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    properHierarchy: boolean;
  };
}

export interface RequirementComparison {
  requirement: string;
  expected: string | number;
  actual: string | number;
  met: boolean;
  category: 'wordcount' | 'structure' | 'images' | 'links' | 'cta' | 'other';
}

export interface ContentAnalysisReport {
  briefSummary: BriefAnalysisSummary;
  outputSummary: OutputAnalysisSummary;
  comparison: RequirementComparison[];
  /** Issues detected, ordered by severity */
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    category: string;
    message: string;
    location?: string;
    suggestion: string;
  }>;
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Strategy compliance score */
  strategyScore: number;
  /** Rule enforcement score */
  rulesScore: number;
  /** Summary text for display */
  summary: string;
}

export interface DuplicateDetectionResult {
  duplicateParagraphs: Array<{
    text: string;
    count: number;
    locations: string[]; // section keys
  }>;
  duplicateHeadings: Array<{
    text: string;
    count: number;
  }>;
  duplicateImages: Array<{
    description: string;
    count: number;
  }>;
  /** Overall duplication score (0 = no duplicates, 100 = severe duplication) */
  duplicationScore: number;
}

// =============================================================================
// Brief Analysis
// =============================================================================

/**
 * Analyze a content brief to understand what data is available
 */
export function analyzeBrief(brief: ContentBrief): BriefAnalysisSummary {
  const populatedFields: string[] = [];
  const emptyFields: string[] = [];

  // Check each important field
  const fieldChecks: Array<{ field: string; hasValue: boolean }> = [
    { field: 'title', hasValue: !!brief.title?.trim() },
    { field: 'targetKeyword', hasValue: !!brief.targetKeyword?.trim() },
    { field: 'searchIntent', hasValue: !!brief.searchIntent?.trim() },
    { field: 'structured_outline', hasValue: (brief.structured_outline?.length || 0) > 0 },
    { field: 'visual_semantics', hasValue: (brief.visual_semantics?.length || 0) > 0 },
    { field: 'cta', hasValue: !!brief.cta?.trim() },
    { field: 'contextualBridge', hasValue: !!brief.contextualBridge },
    { field: 'suggested_internal_links', hasValue: (brief.suggested_internal_links?.length || 0) > 0 },
    { field: 'competitorSpecs', hasValue: brief.competitorSpecs?.dataQuality !== 'none' },
    { field: 'serpAnalysis', hasValue: !!(brief.serpAnalysis as any)?.peopleAlsoAsk?.length },
    { field: 'query_type_format', hasValue: !!brief.query_type_format },
    { field: 'schema_suggestions', hasValue: !!brief.schema_suggestions },
    { field: 'enhanced_visual_semantics', hasValue: !!brief.enhanced_visual_semantics },
  ];

  for (const check of fieldChecks) {
    if (check.hasValue) {
      populatedFields.push(check.field);
    } else {
      emptyFields.push(check.field);
    }
  }

  // Calculate completeness score
  const completenessScore = Math.round((populatedFields.length / fieldChecks.length) * 100);

  // Get internal links count
  let internalLinksCount = 0;
  if (brief.contextualBridge) {
    if (Array.isArray(brief.contextualBridge)) {
      internalLinksCount = brief.contextualBridge.length;
    } else if (brief.contextualBridge.links) {
      internalLinksCount = brief.contextualBridge.links.length;
    }
  }
  if (brief.suggested_internal_links) {
    internalLinksCount += brief.suggested_internal_links.length;
  }

  return {
    title: brief.title || 'Untitled',
    targetKeyword: brief.targetKeyword || 'Not specified',
    targetWordCount: brief.competitorSpecs?.targetWordCount || null,
    searchIntent: brief.searchIntent || null,
    sectionCount: brief.structured_outline?.length || 0,
    visualSemanticsCount: brief.visual_semantics?.length || 0,
    ctaPresent: !!brief.cta?.trim(),
    internalLinksCount,
    competitorSpecsQuality: brief.competitorSpecs?.dataQuality || 'none',
    populatedFields,
    emptyFields,
    completenessScore,
  };
}

// =============================================================================
// Output Analysis
// =============================================================================

/**
 * Analyze generated content output
 */
export function analyzeOutput(
  draft: string,
  sections?: ContentGenerationSection[]
): OutputAnalysisSummary {
  // Word count
  const wordCount = draft.split(/\s+/).filter(Boolean).length;

  // Section count
  const sectionCount = sections?.length || (draft.match(/^##+ /gm) || []).length;

  // Image count
  const imageMatches = draft.match(/\[IMAGE:[^\]]+\]/g) || [];
  const imageCount = imageMatches.length;

  // Internal links
  const linkMatches = draft.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  const internalLinkCount = linkMatches.filter(l => !l.includes('http')).length;

  // CTA detection (look for common CTA patterns)
  const ctaPatterns = [
    /neem contact/i, /contact us/i, /get started/i, /start today/i,
    /vraag.*aan/i, /request/i, /bestel/i, /order/i, /koop/i, /buy/i,
    /gratis.*offerte/i, /free.*quote/i, /bel.*nu/i, /call.*now/i,
  ];
  const ctaFound = ctaPatterns.some(p => p.test(draft));

  // Heading structure
  const h1Count = (draft.match(/^# [^#]/gm) || []).length;
  const h2Count = (draft.match(/^## [^#]/gm) || []).length;
  const h3Count = (draft.match(/^### /gm) || []).length;
  const properHierarchy = h1Count <= 1 && h2Count >= 1;

  // Duplicate detection
  const duplicates = detectDuplicates(draft, sections);

  return {
    wordCount,
    sectionCount,
    imageCount,
    internalLinkCount,
    ctaFound,
    duplicateContentDetected: duplicates.duplicationScore > 20,
    duplicateSections: duplicates.duplicateParagraphs.flatMap(d => d.locations),
    duplicateImages: duplicates.duplicateImages.map(d => d.description),
    headingStructure: {
      h1Count,
      h2Count,
      h3Count,
      properHierarchy,
    },
  };
}

// =============================================================================
// Duplicate Detection
// =============================================================================

/**
 * Detect duplicate content in the draft
 */
export function detectDuplicates(
  draft: string,
  sections?: ContentGenerationSection[]
): DuplicateDetectionResult {
  const duplicateParagraphs: DuplicateDetectionResult['duplicateParagraphs'] = [];
  const duplicateHeadings: DuplicateDetectionResult['duplicateHeadings'] = [];
  const duplicateImages: DuplicateDetectionResult['duplicateImages'] = [];

  // Detect duplicate paragraphs (>100 chars)
  const paragraphMap = new Map<string, { count: number; locations: string[] }>();

  if (sections) {
    for (const section of sections) {
      const content = section.current_content || '';
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 100);

      for (const para of paragraphs) {
        // Normalize: lowercase, single spaces
        const normalized = para.toLowerCase().replace(/\s+/g, ' ').trim();
        const fingerprint = normalized.substring(0, 100);

        const existing = paragraphMap.get(fingerprint);
        if (existing) {
          existing.count++;
          if (!existing.locations.includes(section.section_key)) {
            existing.locations.push(section.section_key);
          }
        } else {
          paragraphMap.set(fingerprint, { count: 1, locations: [section.section_key] });
        }
      }
    }
  }

  // Extract duplicates (count > 1)
  for (const [text, data] of paragraphMap) {
    if (data.count > 1) {
      duplicateParagraphs.push({
        text: text.substring(0, 80) + '...',
        count: data.count,
        locations: data.locations,
      });
    }
  }

  // Detect duplicate headings
  const headingMap = new Map<string, number>();
  const headingMatches = draft.match(/^#{2,3} .+$/gm) || [];
  for (const heading of headingMatches) {
    const normalized = heading.toLowerCase().replace(/^#{2,3}\s*/, '').trim();
    headingMap.set(normalized, (headingMap.get(normalized) || 0) + 1);
  }

  for (const [text, count] of headingMap) {
    if (count > 1) {
      duplicateHeadings.push({ text, count });
    }
  }

  // Detect duplicate images
  const imageMap = new Map<string, number>();
  const imageMatches = draft.match(/\[IMAGE:\s*([^|]+)\s*\|/g) || [];
  for (const match of imageMatches) {
    const desc = match.replace(/^\[IMAGE:\s*/, '').replace(/\s*\|$/, '').toLowerCase().trim();
    const fingerprint = desc.substring(0, 50);
    imageMap.set(fingerprint, (imageMap.get(fingerprint) || 0) + 1);
  }

  for (const [desc, count] of imageMap) {
    if (count > 1) {
      duplicateImages.push({ description: desc, count });
    }
  }

  // Calculate duplication score
  const totalDuplicates =
    duplicateParagraphs.reduce((sum, d) => sum + d.count - 1, 0) +
    duplicateHeadings.reduce((sum, d) => sum + d.count - 1, 0) * 2 +
    duplicateImages.reduce((sum, d) => sum + d.count - 1, 0) * 3;

  const duplicationScore = Math.min(100, totalDuplicates * 10);

  return {
    duplicateParagraphs,
    duplicateHeadings,
    duplicateImages,
    duplicationScore,
  };
}

// =============================================================================
// Comparison
// =============================================================================

/**
 * Compare brief requirements to actual output
 */
export function compareBriefToOutput(
  brief: ContentBrief,
  draft: string,
  sections?: ContentGenerationSection[]
): RequirementComparison[] {
  const comparisons: RequirementComparison[] = [];
  const output = analyzeOutput(draft, sections);

  // Word count comparison
  if (brief.competitorSpecs?.targetWordCount) {
    const target = brief.competitorSpecs.targetWordCount;
    const actual = output.wordCount;
    const met = actual >= target * 0.7 && actual <= target * 1.3;
    comparisons.push({
      requirement: 'Word Count',
      expected: `${Math.round(target * 0.7)}-${Math.round(target * 1.3)}`,
      actual: actual,
      met,
      category: 'wordcount',
    });
  }

  // Section count comparison
  if (brief.structured_outline?.length) {
    comparisons.push({
      requirement: 'Section Count',
      expected: brief.structured_outline.length,
      actual: output.sectionCount,
      met: output.sectionCount === brief.structured_outline.length,
      category: 'structure',
    });
  }

  // Image count comparison
  if (brief.visual_semantics?.length) {
    comparisons.push({
      requirement: 'Image Count',
      expected: brief.visual_semantics.length,
      actual: output.imageCount,
      met: output.imageCount >= brief.visual_semantics.length,
      category: 'images',
    });
  }

  // Internal links comparison
  const briefLinks = analyzeBrief(brief).internalLinksCount;
  if (briefLinks > 0) {
    comparisons.push({
      requirement: 'Internal Links',
      expected: `≥${briefLinks}`,
      actual: output.internalLinkCount,
      met: output.internalLinkCount >= briefLinks * 0.5,
      category: 'links',
    });
  }

  // CTA comparison
  if (brief.cta?.trim()) {
    comparisons.push({
      requirement: 'CTA Present',
      expected: 'Yes',
      actual: output.ctaFound ? 'Yes' : 'No',
      met: output.ctaFound,
      category: 'cta',
    });
  }

  // No duplicates
  comparisons.push({
    requirement: 'No Duplicate Content',
    expected: 'None',
    actual: output.duplicateContentDetected ? `${output.duplicateSections.length} duplicates` : 'None',
    met: !output.duplicateContentDetected,
    category: 'other',
  });

  return comparisons;
}

// =============================================================================
// Full Analysis Report
// =============================================================================

/**
 * Generate a comprehensive content analysis report
 */
export function analyzeContent(
  brief: ContentBrief,
  draft: string,
  sections?: ContentGenerationSection[]
): ContentAnalysisReport {
  const briefSummary = analyzeBrief(brief);
  const outputSummary = analyzeOutput(draft, sections);
  const comparison = compareBriefToOutput(brief, draft, sections);

  // Run strategy and rules evaluation
  const strategyResult = evaluateStrategy({
    brief,
    draft,
    sections,
  });

  const rulesResult = enforceContentRules(brief, sections || [], draft);

  // Build issues list
  const issues: ContentAnalysisReport['issues'] = [];

  // Add strategy blockers as critical issues
  for (const blocker of strategyResult.blockers) {
    issues.push({
      severity: 'critical',
      category: blocker.category,
      message: blocker.description,
      location: blocker.actual?.toString(),
      suggestion: blocker.suggestion || 'Fix before publication',
    });
  }

  // Add strategy warnings
  for (const warning of strategyResult.warnings) {
    issues.push({
      severity: 'warning',
      category: warning.category,
      message: warning.description,
      suggestion: warning.suggestion || 'Consider addressing',
    });
  }

  // Add rule violations
  for (const violation of rulesResult.violations) {
    issues.push({
      severity: 'critical',
      category: violation.category,
      message: violation.message,
      location: violation.location,
      suggestion: violation.suggestion,
    });
  }

  // Add rule warnings
  for (const warning of rulesResult.warnings) {
    issues.push({
      severity: warning.severity === 'warning' ? 'warning' : 'info',
      category: warning.category,
      message: warning.message,
      location: warning.location,
      suggestion: warning.suggestion,
    });
  }

  // Add duplicate content issues
  if (outputSummary.duplicateContentDetected) {
    issues.push({
      severity: 'critical',
      category: 'duplication',
      message: `Duplicate content detected in ${outputSummary.duplicateSections.length} section(s)`,
      suggestion: 'Review and remove duplicated content',
    });
  }

  if (outputSummary.duplicateImages.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'duplication',
      message: `${outputSummary.duplicateImages.length} duplicate image(s) detected`,
      suggestion: 'Ensure each section has unique images',
    });
  }

  // Sort issues by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Calculate overall score
  const comparisonsMet = comparison.filter(c => c.met).length;
  const comparisonsTotal = comparison.length;
  const comparisonScore = comparisonsTotal > 0 ? Math.round((comparisonsMet / comparisonsTotal) * 100) : 100;

  const overallScore = Math.round(
    (strategyResult.overallCompliance * 0.4) +
    (rulesResult.score * 0.3) +
    (comparisonScore * 0.3)
  );

  // Generate summary
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  let summary: string;
  if (criticalCount === 0 && warningCount === 0) {
    summary = `Content passed all checks (${overallScore}% score). Ready for publication.`;
  } else if (criticalCount === 0) {
    summary = `Content has ${warningCount} warning(s) (${overallScore}% score). Review before publication.`;
  } else {
    summary = `Content has ${criticalCount} critical issue(s) and ${warningCount} warning(s) (${overallScore}% score). Needs attention.`;
  }

  return {
    briefSummary,
    outputSummary,
    comparison,
    issues,
    overallScore,
    strategyScore: strategyResult.overallCompliance,
    rulesScore: rulesResult.score,
    summary,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeBrief,
  analyzeOutput,
  detectDuplicates,
  compareBriefToOutput,
  analyzeContent,
};
