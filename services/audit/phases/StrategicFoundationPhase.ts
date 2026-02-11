/**
 * Strategic Foundation Phase Adapter
 *
 * Wraps the Central Entity Analyzer service for the unified audit system.
 * Covers checklist rules 1-32: Macro Context, SC, CSI, E-E-A-T, AI patterns.
 *
 * Currently implements CE presence checks via centralEntityAnalyzer.
 * Future sprints will add SC/CSI alignment, E-E-A-T signals, AI pattern detection.
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import {
  analyzeCentralEntityConsistency,
  parseHtmlContent,
  parseMarkdownContent,
} from '../../ai/centralEntityAnalyzer';
import type { ConsistencyIssue } from '../../ai/centralEntityAnalyzer';
import { SourceContextAligner } from '../rules/SourceContextAligner';
import type { SourceContext, ContentSpecification } from '../rules/SourceContextAligner';

/**
 * Map centralEntityAnalyzer severity to AuditFinding severity.
 */
function mapCeSeverity(severity: ConsistencyIssue['severity']): AuditFinding['severity'] {
  switch (severity) {
    case 'critical': return 'critical';
    case 'warning': return 'high';
    case 'info': return 'low';
    default: return 'medium';
  }
}

export class StrategicFoundationPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'strategicFoundation';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // Rule 6: Source Context / Content Specification alignment
    const contentData = this.extractContent(content);
    if (contentData?.sourceContext && contentData?.contentSpec) {
      totalChecks++;
      const aligner = new SourceContextAligner();
      const alignmentIssues = aligner.validate(
        contentData.text,
        contentData.sourceContext,
        contentData.contentSpec
      );
      for (const issue of alignmentIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Content must serve the business goals defined in the Source Context and Content Specification Index.',
          category: 'Strategic Foundation',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    text: string;
    sourceContext?: SourceContext;
    contentSpec?: ContentSpecification;
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { text: content };
    if (typeof content === 'object' && 'text' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        text: c.text as string,
        sourceContext: c.sourceContext as SourceContext | undefined,
        contentSpec: c.contentSpec as ContentSpecification | undefined,
      };
    }
    return null;
  }

  /**
   * Transform central entity analysis issues into audit findings.
   * Called internally when content is available.
   */
  transformCeIssues(issues: ConsistencyIssue[]): AuditFinding[] {
    return issues.map((issue) =>
      this.createFinding({
        ruleId: `sf-ce-${issue.issue}`,
        severity: mapCeSeverity(issue.severity),
        title: this.getCeIssueTitle(issue.issue),
        description: issue.description,
        whyItMatters: 'The Central Entity must be consistently defined and referenced throughout the page to establish topical focus for search engines.',
        affectedElement: issue.location,
        category: 'Central Entity Consistency',
        estimatedImpact: issue.severity === 'critical' ? 'high' : 'medium',
      })
    );
  }

  private getCeIssueTitle(issueType: ConsistencyIssue['issue']): string {
    switch (issueType) {
      case 'missing_in_h1': return 'Central Entity missing from H1';
      case 'missing_in_intro': return 'Central Entity not defined in introduction';
      case 'missing_in_title': return 'Central Entity missing from title tag';
      case 'missing_in_schema': return 'Central Entity missing from schema markup';
      case 'low_heading_presence': return 'Low Central Entity presence in headings';
      case 'uneven_distribution': return 'Uneven Central Entity distribution';
      case 'contextual_drift': return 'Contextual drift from Central Entity';
      default: return 'Central Entity consistency issue';
    }
  }
}
