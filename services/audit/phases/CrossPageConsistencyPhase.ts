/**
 * Cross-Page Consistency Phase Adapter
 *
 * Validates terminology consistency, entity references, and naming conventions across pages.
 * Ensures the topical map maintains coherent language and entity usage site-wide.
 *
 * Rules implemented:
 *   273 - noindex page has canonical pointing to a different URL (via SignalConflictChecker)
 *   373 - URL blocked by robots.txt but listed in sitemap (via SignalConflictChecker)
 *   371 - Page blocked by robots.txt when it should be indexed (via RobotsTxtParser)
 *   372 - Page has noindex meta tag when it should be indexed (via RobotsTxtParser)
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { SignalConflictChecker } from '../rules/SignalConflictChecker';
import { RobotsTxtParser } from '../rules/RobotsTxtParser';
import { CrossPageConsistencyAuditor } from '../rules/CrossPageConsistencyAuditor';
import { NgramConsistencyChecker } from '../rules/NgramConsistencyChecker';

export class CrossPageConsistencyPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'crossPageConsistency';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const contentData = this.extractContent(content);

    if (contentData?.html && request.url) {
      // Rules 273, 373: Signal conflict checks
      totalChecks += 2;
      const conflictChecker = new SignalConflictChecker();
      const conflicts = conflictChecker.check({
        html: contentData.html,
        pageUrl: request.url,
        robotsTxt: contentData.robotsTxt,
        sitemapUrls: contentData.sitemapUrls,
      });
      for (const conflict of conflicts) {
        findings.push(this.createFinding({
          ruleId: conflict.ruleId,
          severity: conflict.severity,
          title: conflict.title,
          description: conflict.description,
          affectedElement: conflict.affectedElement,
          exampleFix: conflict.exampleFix,
          whyItMatters: 'Conflicting SEO signals confuse search engines and can prevent proper indexing.',
          category: 'Cross-Page Consistency',
        }));
      }

      // Rules 371, 372: Robots.txt and meta robots validation
      totalChecks += 2;
      const robotsParser = new RobotsTxtParser();
      const urlPath = new URL(request.url).pathname;
      const robotsIssues = robotsParser.validate({
        html: contentData.html,
        robotsTxt: contentData.robotsTxt,
        urlPath,
        shouldBeIndexed: true,
      });
      for (const issue of robotsIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Incorrect robots directives can prevent search engines from indexing important content.',
          category: 'Cross-Page Consistency',
        }));
      }
    }

    // Rules 380, 382, 390, 392, 394: Cross-page consistency
    if (request.url) {
      totalChecks++;
      const crossPageAuditor = new CrossPageConsistencyAuditor();
      const crossPageIssues = crossPageAuditor.validate({
        pageUrl: request.url,
        pageCentralEntity: contentData?.pageCentralEntity,
        pageTargetQuery: contentData?.pageTargetQuery,
        siteCentralEntity: contentData?.siteCentralEntity,
        boilerplateHtml: contentData?.boilerplateHtml,
        allPageUrls: contentData?.allPageUrls,
        allPageTargetQueries: contentData?.allPageTargetQueries,
        allPageCentralEntities: contentData?.allPageCentralEntities,
        internalLinksToThisPage: contentData?.internalLinksToThisPage,
        sectionTypes: contentData?.sectionTypes,
      });
      for (const issue of crossPageIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Cross-page consistency ensures a coherent topical authority signal across the site.',
          category: 'Cross-Page Consistency',
        }));
      }
    }

    // N-gram consistency (cross-page validator, only when cross-page content available)
    const crossPageContent = this.extractCrossPageContent(content);
    if (crossPageContent && crossPageContent.size >= 2) {
      totalChecks += 3;
      const ngramReport = NgramConsistencyChecker.analyze(
        crossPageContent,
        contentData?.siteCentralEntity,
      );
      for (const issue of ngramReport.issues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          whyItMatters: 'Inconsistent terminology across pages increases Cost of Retrieval and confuses search engine entity disambiguation.',
          category: 'Cross-Page Consistency',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractCrossPageContent(content: unknown): Map<string, string> | null {
    if (!content || typeof content !== 'object') return null;
    const c = content as Record<string, unknown>;
    if (c.crossPageContent instanceof Map) {
      return c.crossPageContent as Map<string, string>;
    }
    if (c.crossPageContent && typeof c.crossPageContent === 'object') {
      const map = new Map<string, string>();
      for (const [url, text] of Object.entries(c.crossPageContent as Record<string, string>)) {
        map.set(url, text);
      }
      return map.size > 0 ? map : null;
    }
    return null;
  }

  private extractContent(content: unknown): {
    html: string;
    robotsTxt?: string;
    sitemapUrls?: string[];
    pageCentralEntity?: string;
    pageTargetQuery?: string;
    siteCentralEntity?: string;
    boilerplateHtml?: string;
    allPageUrls?: string[];
    allPageTargetQueries?: string[];
    allPageCentralEntities?: string[];
    internalLinksToThisPage?: string[];
    sectionTypes?: string[];
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { html: content };
    if (typeof content === 'object' && 'html' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        html: c.html as string,
        robotsTxt: c.robotsTxt as string | undefined,
        sitemapUrls: c.sitemapUrls as string[] | undefined,
        pageCentralEntity: c.pageCentralEntity as string | undefined,
        pageTargetQuery: c.pageTargetQuery as string | undefined,
        siteCentralEntity: c.siteCentralEntity as string | undefined,
        boilerplateHtml: c.boilerplateHtml as string | undefined,
        allPageUrls: c.allPageUrls as string[] | undefined,
        allPageTargetQueries: c.allPageTargetQueries as string[] | undefined,
        allPageCentralEntities: c.allPageCentralEntities as string[] | undefined,
        internalLinksToThisPage: c.internalLinksToThisPage as string[] | undefined,
        sectionTypes: c.sectionTypes as string[] | undefined,
      };
    }
    return null;
  }
}
