import type { AuditPhase } from './phases/AuditPhase';
import type {
  AuditRequest,
  AuditPhaseResult,
  AuditPhaseName,
  UnifiedAuditReport,
} from './types';
import { DEFAULT_AUDIT_WEIGHTS } from './types';

export interface AuditProgressEvent {
  type: 'start' | 'phase_start' | 'phase_complete' | 'complete';
  phase?: AuditPhaseName;
  progress?: number;
}

export type AuditProgressCallback = (event: AuditProgressEvent) => void;

export class UnifiedAuditOrchestrator {
  private readonly phases: AuditPhase[];

  constructor(phases: AuditPhase[]) {
    this.phases = phases;
  }

  async runAudit(
    request: AuditRequest,
    onProgress?: AuditProgressCallback
  ): Promise<UnifiedAuditReport> {
    const startTime = Date.now();

    onProgress?.({ type: 'start', progress: 0 });

    const phaseResults: AuditPhaseResult[] = [];
    const totalPhases = this.phases.length;

    for (let i = 0; i < totalPhases; i++) {
      const phase = this.phases[i];
      const phaseName = phase.phaseName;

      onProgress?.({
        type: 'phase_start',
        phase: phaseName,
        progress: i / totalPhases,
      });

      let result: AuditPhaseResult;

      try {
        result = await phase.execute(request);
      } catch {
        // Phase failed: produce a zero-score result with an error finding
        result = {
          phase: phaseName,
          score: 0,
          weight: 0,
          passedChecks: 0,
          totalChecks: 0,
          findings: [],
          summary: `Phase "${phaseName}" failed with an error.`,
        };
      }

      // Apply weight from custom weights or defaults
      const weights = request.customWeights ?? DEFAULT_AUDIT_WEIGHTS;
      result.weight = weights[phaseName] ?? DEFAULT_AUDIT_WEIGHTS[phaseName] ?? 0;

      phaseResults.push(result);

      onProgress?.({
        type: 'phase_complete',
        phase: phaseName,
        progress: (i + 1) / totalPhases,
      });
    }

    const overallScore = this.calculateWeightedScore(phaseResults);

    onProgress?.({ type: 'complete', progress: 1 });

    const report: UnifiedAuditReport = {
      id: crypto.randomUUID(),
      projectId: request.projectId,
      auditType: request.type,
      url: request.url,
      overallScore,
      phaseResults,
      contentMergeSuggestions: [],
      missingKnowledgeGraphTopics: [],
      cannibalizationRisks: [],
      language: request.language,
      version: 1,
      createdAt: new Date().toISOString(),
      auditDurationMs: Date.now() - startTime,
      prerequisitesMet: {
        businessInfo: true,
        pillars: true,
        eavs: true,
      },
    };

    return report;
  }

  private calculateWeightedScore(phaseResults: AuditPhaseResult[]): number {
    const totalWeight = phaseResults.reduce((sum, r) => sum + r.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = phaseResults.reduce(
      (sum, r) => sum + r.score * r.weight,
      0
    );

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }
}
