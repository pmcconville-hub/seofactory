/**
 * Cost of Retrieval Phase Adapter
 *
 * Evaluates the technical cost of retrieving information from the page.
 * Covers DOM complexity, TTFB, compression, Core Web Vitals, and HTTP headers.
 *
 * Rules implemented:
 *   292 - DOM node count
 *   304 - TTFB
 *   308 - Compression
 *   311-319 - HTTP headers (caching + security)
 *   320-333 - Core Web Vitals
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { CostOfRetrievalAuditor } from '../rules/CostOfRetrievalAuditor';
import { CoreWebVitalsChecker } from '../rules/CoreWebVitalsChecker';
import { HttpHeadersAuditor } from '../rules/HttpHeadersAuditor';

export class CostOfRetrievalPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'costOfRetrieval';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const contentData = this.extractContent(content);

    // Rules 292, 304, 308: DOM nodes, TTFB, compression
    if (contentData?.html) {
      totalChecks++;
      const corAuditor = new CostOfRetrievalAuditor();
      const corIssues = corAuditor.validate(contentData.html, {
        ttfbMs: contentData.ttfbMs,
        contentEncodingHeader: contentData.contentEncoding,
      });
      for (const issue of corIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          currentValue: issue.currentValue,
          expectedValue: issue.expectedValue,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Technical delivery metrics directly affect how efficiently content can be retrieved and rendered.',
          category: 'Cost of Retrieval',
        }));
      }
    }

    // Rules 320-333: Core Web Vitals
    if (contentData?.cwvMetrics) {
      totalChecks++;
      const cwvChecker = new CoreWebVitalsChecker();
      const cwvIssues = cwvChecker.validate({
        ...contentData.cwvMetrics,
        html: contentData.html,
      });
      for (const issue of cwvIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Core Web Vitals are a confirmed Google ranking signal affecting page experience.',
          category: 'Cost of Retrieval',
        }));
      }
    }

    // Rules 311-319: HTTP headers (caching + security)
    if (contentData?.httpHeaders) {
      totalChecks++;
      const headersAuditor = new HttpHeadersAuditor();
      const headerIssues = headersAuditor.validate({
        headers: contentData.httpHeaders,
        isStaticAsset: false,
        url: request.url,
      });
      for (const issue of headerIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Proper HTTP headers ensure efficient caching and protect against security vulnerabilities.',
          category: 'Cost of Retrieval',
        }));
      }
    }

    // GA4 behavioral signals — high bounce rate / low engagement as CoR indicators
    if (contentData?.ga4BounceRate !== undefined) {
      totalChecks++;
      if (contentData.ga4BounceRate > 70) {
        findings.push(this.createFinding({
          ruleId: 'rule-373',
          severity: contentData.ga4BounceRate > 85 ? 'high' : 'medium',
          title: `High bounce rate (${contentData.ga4BounceRate.toFixed(1)}%)`,
          description:
            `GA4 reports a bounce rate of ${contentData.ga4BounceRate.toFixed(1)}% for this page. ` +
            'A bounce rate above 70% suggests users are not finding the content they expected, ' +
            'which is a behavioral signal of high retrieval cost — the information is present but not ' +
            'efficiently delivered to the user.',
          affectedElement: `Bounce rate: ${contentData.ga4BounceRate.toFixed(1)}%`,
          exampleFix:
            'Improve above-the-fold content with a clear answer in the first 400 characters. ' +
            'Add a table of contents for long content. Ensure the page loads quickly (LCP < 2.5s).',
          whyItMatters: 'Bounce rate is a behavioral signal that correlates with user satisfaction and content relevance.',
          category: 'Cost of Retrieval',
        }));
      }
    }

    if (contentData?.ga4AvgSessionDuration !== undefined) {
      totalChecks++;
      if (contentData.ga4AvgSessionDuration < 10) {
        findings.push(this.createFinding({
          ruleId: 'rule-374',
          severity: 'medium',
          title: `Very low session duration (${contentData.ga4AvgSessionDuration.toFixed(0)}s)`,
          description:
            `GA4 reports an average session duration of ${contentData.ga4AvgSessionDuration.toFixed(0)} seconds. ` +
            'Sessions under 10 seconds suggest users immediately leave, indicating the content fails ' +
            'to engage or answer the search intent.',
          affectedElement: `Avg session: ${contentData.ga4AvgSessionDuration.toFixed(0)}s`,
          exampleFix:
            'Add engaging elements: featured snippet answer in the intro, relevant images, ' +
            'internal links to related content, and structured data for rich results.',
          whyItMatters: 'Low dwell time is a behavioral signal that may affect search ranking through engagement metrics.',
          category: 'Cost of Retrieval',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    html?: string;
    ttfbMs?: number;
    contentEncoding?: string;
    httpHeaders?: Record<string, string>;
    ga4BounceRate?: number;
    ga4AvgSessionDuration?: number;
    cwvMetrics?: {
      lcp?: number;
      fid?: number;
      inp?: number;
      cls?: number;
      fcp?: number;
      ttfb?: number;
      tbt?: number;
      speedIndex?: number;
      domNodes?: number;
      jsPayloadKb?: number;
      cssPayloadKb?: number;
      thirdPartyJsKb?: number;
      totalJsKb?: number;
      renderBlockingCount?: number;
    };
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { html: content };
    if (typeof content === 'object') {
      const c = content as Record<string, unknown>;
      return {
        html: c.html as string | undefined,
        ttfbMs: c.ttfbMs as number | undefined,
        contentEncoding: c.contentEncoding as string | undefined,
        httpHeaders: c.httpHeaders as Record<string, string> | undefined,
        ga4BounceRate: c.ga4BounceRate as number | undefined,
        ga4AvgSessionDuration: c.ga4AvgSessionDuration as number | undefined,
        cwvMetrics: c.cwvMetrics as Record<string, number | undefined> | undefined,
      };
    }
    return null;
  }
}
