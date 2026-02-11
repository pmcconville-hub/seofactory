/**
 * URL Architecture Phase Adapter
 *
 * Evaluates URL structure, slug optimization, breadcrumb consistency, and URL hierarchy.
 * Ensures URLs align with site taxonomy and topical map structure.
 *
 * Rules implemented:
 *   358       - Server error (5xx)
 *   363       - Redirect loop detected
 *   363-chain - Long redirect chain (>2 hops)
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { RedirectChainChecker, type UrlFetcher } from '../rules/RedirectChainChecker';

export class UrlArchitecturePhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'urlArchitecture';
  private readonly urlFetcher?: UrlFetcher;

  constructor(urlFetcher?: UrlFetcher) {
    super();
    this.urlFetcher = urlFetcher;
  }

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    if (request.url) {
      // Rules 358, 363: Redirect chain and 5xx detection
      totalChecks += 2;
      const checker = new RedirectChainChecker(this.urlFetcher);
      try {
        const result = await checker.check(request.url);
        for (const issue of result.issues) {
          findings.push(this.createFinding({
            ruleId: issue.ruleId,
            severity: issue.severity,
            title: issue.title,
            description: issue.description,
            affectedElement: issue.affectedElement,
            exampleFix: issue.exampleFix,
            whyItMatters: 'Server errors and redirect chains waste crawl budget and harm user experience.',
            category: 'URL Architecture',
          }));
        }
      } catch {
        // Non-fatal: redirect check may fail for network reasons
      }
    }

    return this.buildResult(findings, totalChecks);
  }
}
