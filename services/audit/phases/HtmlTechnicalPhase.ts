/**
 * HTML Technical Phase Adapter
 *
 * Validates HTML tag structure, heading hierarchy, semantic HTML usage, and schema markup presence.
 * Covers on-page technical SEO checks at the HTML level.
 *
 * Rule 256: All images must have alt text.
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { HtmlNestingValidator } from '../rules/HtmlNestingValidator';

export class HtmlTechnicalPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'htmlTechnical';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const html = this.extractHtml(content);
    if (html) {
      // Rule 256: All images must have alt text
      totalChecks++;
      const altIssues = this.checkAltText(html);
      findings.push(...altIssues);

      // Rules 242, 243, 251, 252: HTML nesting checks
      totalChecks += 4;
      const nestingValidator = new HtmlNestingValidator();
      const nestingIssues = nestingValidator.validate(html);
      for (const issue of nestingIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Proper HTML nesting ensures correct rendering and prevents parsing errors by search engines.',
          category: 'HTML Technical',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractHtml(content: unknown): string | null {
    if (!content) return null;
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && 'html' in (content as Record<string, unknown>)) {
      return (content as Record<string, unknown>).html as string;
    }
    return null;
  }

  /**
   * Rule 256: Check that all <img> tags have non-empty alt attributes.
   */
  checkAltText(html: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const imgRegex = /<img\b[^>]*>/gi;
    let match;
    const missingAlt: string[] = [];
    const emptyAlt: string[] = [];

    while ((match = imgRegex.exec(html)) !== null) {
      const imgTag = match[0];
      const altMatch = imgTag.match(/\balt\s*=\s*["']([^"']*)["']/i);
      const srcMatch = imgTag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      const src = srcMatch?.[1] || 'unknown';

      if (!altMatch) {
        missingAlt.push(src);
      } else if (altMatch[1].trim() === '') {
        emptyAlt.push(src);
      }
    }

    if (missingAlt.length > 0) {
      findings.push(this.createFinding({
        ruleId: 'rule-256-missing',
        severity: 'critical',
        title: 'Images missing alt attribute',
        description: `${missingAlt.length} image(s) have no alt attribute: ${missingAlt.slice(0, 3).join(', ')}${missingAlt.length > 3 ? '...' : ''}`,
        whyItMatters: 'Alt text is essential for accessibility and helps search engines understand image content.',
        currentValue: `${missingAlt.length} images without alt`,
        expectedValue: 'All images should have descriptive alt text',
        exampleFix: 'Add alt="descriptive text" to each img tag',
        category: 'HTML Technical',
        estimatedImpact: 'high',
      }));
    }

    if (emptyAlt.length > 0) {
      findings.push(this.createFinding({
        ruleId: 'rule-256-empty',
        severity: 'high',
        title: 'Images with empty alt text',
        description: `${emptyAlt.length} image(s) have empty alt attributes: ${emptyAlt.slice(0, 3).join(', ')}${emptyAlt.length > 3 ? '...' : ''}`,
        whyItMatters: 'Empty alt text is only appropriate for decorative images. Content images need descriptive alt text.',
        currentValue: `${emptyAlt.length} images with alt=""`,
        expectedValue: 'Descriptive alt text for non-decorative images',
        category: 'HTML Technical',
        estimatedImpact: 'medium',
      }));
    }

    return findings;
  }
}
