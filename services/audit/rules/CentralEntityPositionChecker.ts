/**
 * CentralEntityPositionChecker
 *
 * Checks Central Entity (CE) position in text and validates content structure
 * alignment with Source Context (SC) attributes and Content Specification
 * Index (CSI) predicates.
 *
 * Rules implemented:
 *   rule-4  - CE must appear in the first 2 sentences (or first 5% of main content via structural analysis)
 *   rule-5  - CE should appear in the very first sentence (or H1 via structural analysis)
 *   rule-7  - Source Context attribute coverage (>= 50%)
 *   rule-8  - CS/AS classification signals (general + specific)
 *   rule-11 - CSI predicate coverage (>= 30%)
 */

import type { StructuralAnalysis } from '../../../types';

export interface CePositionIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class CentralEntityPositionChecker {
  /**
   * Validate CE positioning and SC/CSI alignment.
   * Rules 4-5, 7-9, 11-13
   */
  validate(content: {
    text: string;
    centralEntity: string;
    sourceContextAttributes?: string[];
    csiPredicates?: string[];
    structuralAnalysis?: StructuralAnalysis;
  }): CePositionIssue[] {
    const issues: CePositionIssue[] = [];
    const sentences = this.splitSentences(content.text);
    const ce = content.centralEntity.toLowerCase();

    const ep = content.structuralAnalysis?.entityProminence;
    if (ep) {
      // Enhanced Rule 4: CE position using structural analysis
      if (ep.firstMentionPosition > 0.05) {
        issues.push({
          ruleId: 'rule-4',
          severity: 'high',
          title: 'CE not near start of main content',
          description:
            `"${content.centralEntity}" first appears at ${Math.round(ep.firstMentionPosition * 100)}% into main content. Target: within first 5%.`,
          exampleFix: 'Move the Central Entity mention to the beginning of the main content area.',
        });
      }

      // Enhanced Rule 5: CE in H1
      if (!ep.inH1) {
        issues.push({
          ruleId: 'rule-5',
          severity: 'medium',
          title: 'CE not in H1',
          description:
            `"${content.centralEntity}" is not in the page's H1 heading. The H1 is the strongest on-page relevance signal.`,
          exampleFix: 'Include the Central Entity in the H1 heading.',
        });
      }

      // Skip the text-based rules 4/5 since we have structural data
    } else {
      // Fallback: text-based rules 4 and 5

      // Rule 4: CE in first 2 sentences
      const first2 = sentences.slice(0, 2).join(' ').toLowerCase();
      if (!first2.includes(ce)) {
        issues.push({
          ruleId: 'rule-4',
          severity: 'high',
          title: 'CE not in first 2 sentences',
          description:
            `"${content.centralEntity}" does not appear in the first two sentences. ` +
            'The Central Entity should be introduced early to establish topical focus for both readers and search engines.',
          exampleFix: 'Mention the Central Entity within the first two sentences.',
        });
      }

      // Rule 5: CE in first sentence (stricter)
      const first1 = (sentences[0] || '').toLowerCase();
      if (!first1.includes(ce)) {
        issues.push({
          ruleId: 'rule-5',
          severity: 'medium',
          title: 'CE not in first sentence',
          description:
            `"${content.centralEntity}" does not appear in the very first sentence. ` +
            'Leading with the Central Entity signals immediate relevance.',
          exampleFix: 'Start the article with a sentence containing the Central Entity.',
        });
      }
    }

    // Rule 7: SC attribute priority — if source context attributes provided, check coverage
    if (content.sourceContextAttributes && content.sourceContextAttributes.length > 0) {
      const lowerText = content.text.toLowerCase();
      const covered = content.sourceContextAttributes.filter(
        (a) => lowerText.includes(a.toLowerCase())
      );
      const coverage = covered.length / content.sourceContextAttributes.length;
      if (coverage < 0.5) {
        const missing = content.sourceContextAttributes.filter(
          (a) => !lowerText.includes(a.toLowerCase())
        );
        issues.push({
          ruleId: 'rule-7',
          severity: 'high',
          title: 'Low Source Context attribute coverage',
          description:
            `Only ${covered.length}/${content.sourceContextAttributes.length} SC attributes ` +
            `(${Math.round(coverage * 100)}%) are covered in the text. At least 50% is recommended.`,
          affectedElement: missing.slice(0, 5).join(', '),
          exampleFix: 'Cover more Source Context attributes in the content.',
        });
      }
    }

    // Rules 8-9: CS/AS classification — check if text addresses different attribute categories
    // CS (Core Specification) = fundamental attributes, AS (Attribute Specification) = detailed attributes
    // We validate that the content has both general and specific information
    const hasGeneralStatements =
      /\b(overview|introduction|definition|what is)\b/i.test(content.text);
    const hasSpecificDetails =
      /\b\d+\s*(?:mg|kg|cm|mm|%|hours?|minutes?|seconds?|dollars?|euros?)/i.test(
        content.text
      );
    if (!hasGeneralStatements && !hasSpecificDetails) {
      issues.push({
        ruleId: 'rule-8',
        severity: 'medium',
        title: 'Missing CS/AS classification signals',
        description:
          'Content lacks both general overview (CS) and specific detail (AS) signals. ' +
          'Well-structured content should include both overview-level context and measurable specifics.',
        exampleFix:
          'Include both overview-level context and specific measurable details.',
      });
    }

    // Rules 11-13: CSI predicates — if provided, check coverage
    if (content.csiPredicates && content.csiPredicates.length > 0) {
      const lowerText = content.text.toLowerCase();
      const covered = content.csiPredicates.filter(
        (p) => lowerText.includes(p.toLowerCase())
      );
      const coverage = covered.length / content.csiPredicates.length;
      if (coverage < 0.3) {
        const missing = content.csiPredicates.filter(
          (p) => !lowerText.includes(p.toLowerCase())
        );
        issues.push({
          ruleId: 'rule-11',
          severity: 'high',
          title: 'Low CSI predicate coverage',
          description:
            `Only ${covered.length}/${content.csiPredicates.length} CSI predicates ` +
            `(${Math.round(coverage * 100)}%) found in content. At least 30% is recommended.`,
          affectedElement: missing.slice(0, 5).join(', '),
          exampleFix:
            'Address more Content Specification Index predicates in the article.',
        });
      }
    }

    return issues;
  }

  /**
   * Simple sentence splitter: split on period, question mark, or exclamation
   * followed by whitespace or end of string.
   */
  splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
