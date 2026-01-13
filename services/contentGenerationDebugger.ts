/**
 * Content Generation Debugger
 *
 * Provides comprehensive debugging, analysis, and export capabilities for content generation.
 * Enables step-by-step verification, pass snapshots, and full data export for Claude analysis.
 *
 * Created: January 13, 2026
 */

import {
  ContentBrief,
  ContentGenerationJob,
  ContentGenerationSection,
  BusinessInfo,
  TopicalMap,
  EnrichedTopic
} from '../types';
import { analyzeContent, analyzeBrief, analyzeOutput, detectDuplicates } from './contentAnalyzer';
import { evaluateStrategy } from './contentStrategyEnforcer';
import { enforceContentRules } from './contentRuleEnforcer';

// =============================================================================
// Types
// =============================================================================

export interface PassSnapshot {
  passNumber: number;
  passName: string;
  timestamp: string;
  beforeContent: string;
  afterContent: string;
  sectionsModified: string[];
  wordCountBefore: number;
  wordCountAfter: number;
  validationResult?: {
    passed: boolean;
    score: number;
    violations: string[];
    warnings: string[];
  };
}

export interface GenerationDebugData {
  // Metadata
  exportedAt: string;
  jobId: string;
  topicId: string;
  topicTitle: string;

  // Input Data
  input: {
    brief: ContentBrief;
    businessInfo: BusinessInfo;
    topic: EnrichedTopic;
    mapContext?: {
      pillars: string[];
      eavCount: number;
      topicCount: number;
    };
  };

  // Process Data
  process: {
    passSnapshots: PassSnapshot[];
    validationHistory: Array<{
      pass: number;
      timestamp: string;
      strategyCompliance: number;
      ruleEnforcement: {
        passed: boolean;
        score: number;
        violations: string[];
      };
    }>;
    sectionVersions: Record<string, Array<{
      passNumber: number;
      content: string;
      wordCount: number;
    }>>;
  };

  // Output Data
  output: {
    finalDraft: string;
    sections: ContentGenerationSection[];
    wordCount: number;
    auditScore?: number;
    schemaData?: unknown;
  };

  // Analysis
  analysis: {
    briefAnalysis: ReturnType<typeof analyzeBrief>;
    outputAnalysis: ReturnType<typeof analyzeOutput>;
    duplicateCheck: ReturnType<typeof detectDuplicates>;
    strategyCompliance: ReturnType<typeof evaluateStrategy>;
    ruleEnforcement: ReturnType<typeof enforceContentRules>;
    briefToOutputComparison: Array<{
      requirement: string;
      expected: string;
      actual: string;
      met: boolean;
    }>;
  };

  // Issues Summary
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    category: string;
    message: string;
    location?: string;
    suggestion: string;
  }>;
}

export interface DebugExportOptions {
  includeFullBrief: boolean;
  includePassSnapshots: boolean;
  includeSectionVersions: boolean;
  includeAnalysis: boolean;
  format: 'json' | 'markdown' | 'clipboard';
}

// =============================================================================
// Pass Snapshot Storage
// =============================================================================

const passSnapshotsStore = new Map<string, PassSnapshot[]>();
const sectionVersionsStore = new Map<string, Map<string, Array<{ passNumber: number; content: string }>>>();

/**
 * Store a pass snapshot for debugging
 */
export function storePassSnapshot(
  jobId: string,
  snapshot: PassSnapshot
): void {
  const existing = passSnapshotsStore.get(jobId) || [];
  existing.push(snapshot);
  passSnapshotsStore.set(jobId, existing);
  console.log(`[Debug] Stored snapshot for pass ${snapshot.passNumber} (${snapshot.passName})`);
}

/**
 * Store a section version after a pass
 */
export function storeSectionVersion(
  jobId: string,
  sectionKey: string,
  passNumber: number,
  content: string
): void {
  let jobSections = sectionVersionsStore.get(jobId);
  if (!jobSections) {
    jobSections = new Map();
    sectionVersionsStore.set(jobId, jobSections);
  }

  const versions = jobSections.get(sectionKey) || [];
  versions.push({ passNumber, content });
  jobSections.set(sectionKey, versions);
}

/**
 * Get all pass snapshots for a job
 */
export function getPassSnapshots(jobId: string): PassSnapshot[] {
  return passSnapshotsStore.get(jobId) || [];
}

/**
 * Get all section versions for a job
 */
export function getSectionVersions(jobId: string): Record<string, Array<{ passNumber: number; content: string; wordCount: number }>> {
  const jobSections = sectionVersionsStore.get(jobId);
  if (!jobSections) return {};

  const result: Record<string, Array<{ passNumber: number; content: string; wordCount: number }>> = {};
  jobSections.forEach((versions, key) => {
    result[key] = versions.map(v => ({
      ...v,
      wordCount: v.content.split(/\s+/).filter(Boolean).length
    }));
  });
  return result;
}

/**
 * Clear debug data for a job (call after export or on job completion)
 */
export function clearDebugData(jobId: string): void {
  passSnapshotsStore.delete(jobId);
  sectionVersionsStore.delete(jobId);
}

// =============================================================================
// Debug Export
// =============================================================================

/**
 * Export comprehensive debug data for a generation job
 */
export function exportDebugData(
  job: ContentGenerationJob,
  brief: ContentBrief,
  sections: ContentGenerationSection[],
  businessInfo: BusinessInfo,
  topic: EnrichedTopic,
  map?: TopicalMap,
  options: Partial<DebugExportOptions> = {}
): GenerationDebugData {
  const opts: DebugExportOptions = {
    includeFullBrief: true,
    includePassSnapshots: true,
    includeSectionVersions: true,
    includeAnalysis: true,
    format: 'json',
    ...options
  };

  const finalDraft = job.draft_content || '';

  // Get analysis data
  const briefAnalysis = analyzeBrief(brief);
  const outputAnalysis = analyzeOutput(finalDraft, sections);
  const duplicateCheck = detectDuplicates(finalDraft, sections);
  const strategyCompliance = evaluateStrategy({ brief, draft: finalDraft, sections });
  const ruleEnforcement = enforceContentRules(brief, sections, finalDraft);

  // Build comparison
  const briefToOutputComparison = buildBriefToOutputComparison(brief, finalDraft, sections);

  // Collect all issues
  const issues = collectAllIssues(
    briefAnalysis,
    outputAnalysis,
    duplicateCheck,
    strategyCompliance,
    ruleEnforcement
  );

  const debugData: GenerationDebugData = {
    exportedAt: new Date().toISOString(),
    jobId: job.id,
    topicId: topic.id,
    topicTitle: topic.title,

    input: {
      brief: opts.includeFullBrief ? brief : { id: brief.id, title: brief.title } as ContentBrief,
      businessInfo,
      topic,
      mapContext: map ? {
        pillars: map.pillars ? [map.pillars.centralEntity, map.pillars.sourceContext].filter(Boolean) : [],
        eavCount: map.eavs?.length || 0,
        topicCount: map.topics?.length || (map.topicCounts?.total || 0)
      } : undefined
    },

    process: {
      passSnapshots: opts.includePassSnapshots ? getPassSnapshots(job.id) : [],
      validationHistory: [], // TODO: Store validation history during generation
      sectionVersions: opts.includeSectionVersions ? getSectionVersions(job.id) : {}
    },

    output: {
      finalDraft,
      sections,
      wordCount: finalDraft.split(/\s+/).filter(Boolean).length,
      auditScore: job.final_audit_score ?? undefined,
      schemaData: job.schema_data
    },

    analysis: opts.includeAnalysis ? {
      briefAnalysis,
      outputAnalysis,
      duplicateCheck,
      strategyCompliance,
      ruleEnforcement,
      briefToOutputComparison
    } : {} as GenerationDebugData['analysis'],

    issues
  };

  return debugData;
}

/**
 * Format debug data for Claude analysis
 */
export function formatForClaudeAnalysis(data: GenerationDebugData): string {
  let output = `# Content Generation Debug Report
Generated: ${data.exportedAt}
Job ID: ${data.jobId}
Topic: ${data.topicTitle}

## Summary

**Word Count:** ${data.output.wordCount}
**Audit Score:** ${data.output.auditScore ?? 'N/A'}
**Strategy Compliance:** ${data.analysis.strategyCompliance?.overallCompliance ?? 'N/A'}%
**Rule Enforcement:** ${data.analysis.ruleEnforcement?.score ?? 'N/A'}/100

## Issues Found (${data.issues.length})

`;

  // Group issues by severity
  const critical = data.issues.filter(i => i.severity === 'critical');
  const warnings = data.issues.filter(i => i.severity === 'warning');
  const info = data.issues.filter(i => i.severity === 'info');

  if (critical.length > 0) {
    output += `### Critical Issues (${critical.length})\n`;
    critical.forEach(i => {
      output += `- **${i.category}**: ${i.message}\n  → ${i.suggestion}\n`;
    });
    output += '\n';
  }

  if (warnings.length > 0) {
    output += `### Warnings (${warnings.length})\n`;
    warnings.forEach(i => {
      output += `- **${i.category}**: ${i.message}\n  → ${i.suggestion}\n`;
    });
    output += '\n';
  }

  if (info.length > 0) {
    output += `### Info (${info.length})\n`;
    info.forEach(i => {
      output += `- **${i.category}**: ${i.message}\n`;
    });
    output += '\n';
  }

  // Brief vs Output Comparison
  output += `## Brief vs Output Comparison\n\n`;
  const unmet = data.analysis.briefToOutputComparison?.filter(c => !c.met) || [];
  if (unmet.length > 0) {
    output += `**Unmet Requirements (${unmet.length}):**\n`;
    unmet.forEach(c => {
      output += `- ${c.requirement}: Expected "${c.expected}", got "${c.actual}"\n`;
    });
  } else {
    output += `All ${data.analysis.briefToOutputComparison?.length || 0} requirements met.\n`;
  }
  output += '\n';

  // Duplicate Check
  if (data.analysis.duplicateCheck) {
    const { duplicateParagraphs, duplicateHeadings, duplicateImages } = data.analysis.duplicateCheck;
    if (duplicateParagraphs.length > 0 || duplicateHeadings.length > 0 || duplicateImages.length > 0) {
      output += `## Duplicate Content Detected\n\n`;
      if (duplicateParagraphs.length > 0) {
        output += `**Duplicate Paragraphs:** ${duplicateParagraphs.length}\n`;
        duplicateParagraphs.slice(0, 3).forEach(d => {
          output += `- "${d.text.substring(0, 100)}..." (×${d.count})\n`;
        });
      }
      if (duplicateImages.length > 0) {
        output += `**Duplicate Images:** ${duplicateImages.length}\n`;
        duplicateImages.forEach(d => {
          output += `- "${d.description}" (×${d.count})\n`;
        });
      }
      output += '\n';
    }
  }

  // Pass Snapshots Summary
  if (data.process.passSnapshots.length > 0) {
    output += `## Pass History (${data.process.passSnapshots.length} passes)\n\n`;
    output += `| Pass | Name | Words Before | Words After | Sections Modified | Valid |\n`;
    output += `|------|------|--------------|-------------|-------------------|-------|\n`;
    data.process.passSnapshots.forEach(s => {
      output += `| ${s.passNumber} | ${s.passName} | ${s.wordCountBefore} | ${s.wordCountAfter} | ${s.sectionsModified.length} | ${s.validationResult?.passed ? '✓' : '✗'} |\n`;
    });
    output += '\n';
  }

  // Brief Summary
  output += `## Brief Analysis\n\n`;
  const ba = data.analysis.briefAnalysis;
  if (ba) {
    output += `**Populated Fields:** ${ba.populatedFields?.length || 0}\n`;
    output += `**Empty Fields:** ${ba.emptyFields?.join(', ') || 'None'}\n`;
    output += `**Visual Semantics:** ${ba.visualSemanticsCount || 0}\n`;
    output += `**Internal Links Suggested:** ${ba.internalLinksCount || 0}\n`;
    output += `**CTA Defined:** ${ba.ctaPresent ? 'Yes' : 'No'}\n`;
  }
  output += '\n';

  // Sections
  output += `## Sections (${data.output.sections.length})\n\n`;
  data.output.sections.forEach((s, i) => {
    const wordCount = s.current_content?.split(/\s+/).filter(Boolean).length || 0;
    output += `${i + 1}. **${s.section_heading}** (${wordCount} words)\n`;
  });

  return output;
}

/**
 * Copy debug data to clipboard (for browser environment)
 */
export function copyToClipboard(data: GenerationDebugData, format: 'json' | 'markdown' = 'markdown'): string {
  const content = format === 'json'
    ? JSON.stringify(data, null, 2)
    : formatForClaudeAnalysis(data);

  // Return the content - actual clipboard copy needs to be done in the browser
  return content;
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildBriefToOutputComparison(
  brief: ContentBrief,
  draft: string,
  sections: ContentGenerationSection[]
): Array<{ requirement: string; expected: string; actual: string; met: boolean }> {
  const comparisons: Array<{ requirement: string; expected: string; actual: string; met: boolean }> = [];
  const draftLower = draft.toLowerCase();
  const wordCount = draft.split(/\s+/).filter(Boolean).length;

  // Word count check
  if (brief.competitorSpecs?.targetWordCount) {
    const target = brief.competitorSpecs.targetWordCount;
    const min = target * 0.7;
    const max = target * 1.3;
    comparisons.push({
      requirement: 'Word Count',
      expected: `${Math.round(min)}-${Math.round(max)} words`,
      actual: `${wordCount} words`,
      met: wordCount >= min && wordCount <= max
    });
  }

  // CTA check
  if (brief.cta) {
    const ctaWords = brief.cta.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const foundWords = ctaWords.filter(w => draftLower.includes(w));
    comparisons.push({
      requirement: 'CTA',
      expected: brief.cta,
      actual: foundWords.length > 0 ? `Found ${foundWords.length}/${ctaWords.length} key words` : 'Not found',
      met: foundWords.length >= ctaWords.length * 0.5
    });
  }

  // Visual semantics check
  const visualCount = brief.visual_semantics?.length ||
    Object.keys(brief.enhanced_visual_semantics?.section_images || {}).length;
  if (visualCount > 0) {
    const imagePattern = /\[IMAGE:[^\]]+\]|!\[[^\]]*\]\([^)]+\)/gi;
    const imagesInDraft = (draft.match(imagePattern) || []).length;
    comparisons.push({
      requirement: 'Images',
      expected: `${visualCount} images`,
      actual: `${imagesInDraft} images`,
      met: imagesInDraft >= visualCount
    });
  }

  // Internal links check
  const suggestedLinks = brief.suggested_internal_links?.length || 0;
  const contextualLinks = Array.isArray(brief.contextualBridge)
    ? brief.contextualBridge.length
    : brief.contextualBridge?.links?.length || 0;
  const totalExpectedLinks = suggestedLinks + contextualLinks;
  if (totalExpectedLinks > 0) {
    const linkPattern = /\[[^\]]+\]\([^)]+\)/g;
    const linksInDraft = (draft.match(linkPattern) || []).length;
    comparisons.push({
      requirement: 'Internal Links',
      expected: `${totalExpectedLinks} links`,
      actual: `${linksInDraft} links`,
      met: linksInDraft >= totalExpectedLinks * 0.5
    });
  }

  // Section count check
  const expectedSections = brief.structured_outline?.length || 0;
  if (expectedSections > 0) {
    comparisons.push({
      requirement: 'Sections',
      expected: `${expectedSections} sections`,
      actual: `${sections.length} sections`,
      met: sections.length >= expectedSections
    });
  }

  return comparisons;
}

function collectAllIssues(
  briefAnalysis: ReturnType<typeof analyzeBrief>,
  outputAnalysis: ReturnType<typeof analyzeOutput>,
  duplicateCheck: ReturnType<typeof detectDuplicates>,
  strategyCompliance: ReturnType<typeof evaluateStrategy>,
  ruleEnforcement: ReturnType<typeof enforceContentRules>
): GenerationDebugData['issues'] {
  const issues: GenerationDebugData['issues'] = [];

  // Duplicate issues (critical)
  if (duplicateCheck.duplicateParagraphs.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'duplication',
      message: `${duplicateCheck.duplicateParagraphs.length} duplicate paragraphs detected`,
      suggestion: 'Review batch processing - sections may be receiving same content'
    });
  }
  if (duplicateCheck.duplicateImages.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'duplication',
      message: `${duplicateCheck.duplicateImages.length} duplicate images detected`,
      suggestion: 'Check Pass 4 image insertion - same placeholder used multiple times'
    });
  }

  // Strategy blockers (critical)
  strategyCompliance.blockers?.forEach(blocker => {
    issues.push({
      severity: 'critical',
      category: 'strategy',
      message: blocker.name,
      suggestion: blocker.suggestion || 'Address this blocker before continuing'
    });
  });

  // Rule violations (critical/warning)
  ruleEnforcement.violations.forEach(v => {
    issues.push({
      severity: v.severity === 'error' ? 'critical' : 'warning',
      category: v.category,
      message: v.message,
      location: v.location,
      suggestion: v.suggestion
    });
  });
  ruleEnforcement.warnings.forEach(v => {
    issues.push({
      severity: 'warning',
      category: v.category,
      message: v.message,
      location: v.location,
      suggestion: v.suggestion
    });
  });

  // Brief analysis issues
  if (briefAnalysis.emptyFields && briefAnalysis.emptyFields.length > 5) {
    issues.push({
      severity: 'warning',
      category: 'brief',
      message: `${briefAnalysis.emptyFields.length} brief fields are empty`,
      suggestion: 'Consider enriching the brief with more data before generation'
    });
  }

  // Output analysis issues
  if (outputAnalysis.wordCount < 500) {
    issues.push({
      severity: 'warning',
      category: 'length',
      message: `Output is only ${outputAnalysis.wordCount} words`,
      suggestion: 'Content may be too short for comprehensive coverage'
    });
  }

  return issues;
}

// =============================================================================
// Validation Gate
// =============================================================================

export interface ValidationGateResult {
  passed: boolean;
  canProceed: boolean;  // false only in hard mode with errors
  score: number;
  errors: string[];
  warnings: string[];
  requiresCheckpoint: boolean;
}

/**
 * Run validation gate based on mode
 */
export function runValidationGate(
  mode: 'soft' | 'hard' | 'checkpoint',
  brief: ContentBrief,
  sections: ContentGenerationSection[],
  currentDraft: string,
  passNumber: number
): ValidationGateResult {
  // Run all validators
  const strategyResult = evaluateStrategy({ brief, draft: currentDraft, sections });
  const ruleResult = enforceContentRules(brief, sections, currentDraft);
  const duplicates = detectDuplicates(currentDraft, sections);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Collect errors
  if (strategyResult.blockers.length > 0) {
    errors.push(...strategyResult.blockers.map(b => `Strategy blocker: ${b.name}`));
  }
  if (!ruleResult.passed) {
    errors.push(...ruleResult.violations.map(v => `Rule violation: ${v.message}`));
  }
  if (duplicates.duplicateParagraphs.length > 0) {
    errors.push(`Duplicate content: ${duplicates.duplicateParagraphs.length} paragraphs repeated`);
  }
  if (duplicates.duplicateImages.length > 0) {
    errors.push(`Duplicate images: ${duplicates.duplicateImages.length} images repeated`);
  }

  // Collect warnings
  warnings.push(...ruleResult.warnings.map(w => w.message));
  if (strategyResult.overallCompliance < 70) {
    warnings.push(`Low strategy compliance: ${strategyResult.overallCompliance}%`);
  }

  // Calculate score
  const score = Math.round((strategyResult.overallCompliance + ruleResult.score) / 2);

  // Determine outcome based on mode
  let canProceed = true;
  let requiresCheckpoint = false;

  switch (mode) {
    case 'hard':
      canProceed = errors.length === 0;
      break;
    case 'checkpoint':
      requiresCheckpoint = errors.length > 0 || score < 70;
      canProceed = true; // Always allow proceed in checkpoint mode (user decides)
      break;
    case 'soft':
    default:
      canProceed = true;
      break;
  }

  return {
    passed: errors.length === 0,
    canProceed,
    score,
    errors,
    warnings,
    requiresCheckpoint
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  storePassSnapshot,
  storeSectionVersion,
  getPassSnapshots,
  getSectionVersions,
  clearDebugData,
  exportDebugData,
  formatForClaudeAnalysis,
  copyToClipboard,
  runValidationGate
};
