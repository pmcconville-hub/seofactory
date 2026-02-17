import type { SemanticAuditResult } from '../../types';

export interface BatchSemanticInput {
  id: string;          // inventory item ID
  url: string;
  content: string;
}

export interface BatchSemanticProgress {
  total: number;
  completed: number;
  failed: number;
  currentUrl: string;
}

export interface BatchSemanticResultItem {
  inventoryId: string;
  success: boolean;
  result?: SemanticAuditResult;
  detectedCE?: string;
  detectedSC?: string;
  detectedCSI?: string;
  overallScore?: number;
  error?: string;
}

interface BatchSemanticAnalysisConfig {
  analyzeFn: (content: string, url: string) => Promise<SemanticAuditResult>;
  concurrency: number;
  checkCacheFn?: (inventoryId: string, content: string) => Promise<SemanticAuditResult | null>;
  persistFn?: (inventoryId: string, result: SemanticAuditResult, content: string) => Promise<void>;
}

export class BatchSemanticAnalysisService {
  private config: BatchSemanticAnalysisConfig;

  constructor(config: BatchSemanticAnalysisConfig) {
    this.config = config;
  }

  async analyze(
    items: BatchSemanticInput[],
    onProgress?: (progress: BatchSemanticProgress) => void,
    signal?: AbortSignal
  ): Promise<BatchSemanticResultItem[]> {
    const results: BatchSemanticResultItem[] = [];
    let completed = 0;
    let failed = 0;

    // Process in batches respecting concurrency
    const queue = [...items];
    const inFlight: Promise<void>[] = [];

    const processItem = async (item: BatchSemanticInput) => {
      if (signal?.aborted) return;

      try {
        // Check cache first
        let analysisResult: SemanticAuditResult | null = null;
        if (this.config.checkCacheFn) {
          analysisResult = await this.config.checkCacheFn(item.id, item.content);
        }

        if (!analysisResult) {
          analysisResult = await this.config.analyzeFn(item.content, item.url);
          // Persist if handler provided
          if (this.config.persistFn && analysisResult) {
            await this.config.persistFn(item.id, analysisResult, item.content);
          }
        }

        results.push({
          inventoryId: item.id,
          success: true,
          result: analysisResult,
          detectedCE: analysisResult.coreEntities?.centralEntity,
          detectedSC: analysisResult.coreEntities?.detectedSourceContext,
          detectedCSI: analysisResult.coreEntities?.searchIntent,
          overallScore: analysisResult.overallScore,
        });
      } catch (err) {
        failed++;
        results.push({
          inventoryId: item.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      completed++;
      onProgress?.({
        total: items.length,
        completed,
        failed,
        currentUrl: item.url,
      });
    };

    // Concurrency-limited execution
    for (const item of queue) {
      if (signal?.aborted) break;

      const promise = processItem(item).then(() => {
        const idx = inFlight.indexOf(promise);
        if (idx >= 0) inFlight.splice(idx, 1);
      });
      inFlight.push(promise);

      if (inFlight.length >= this.config.concurrency) {
        await Promise.race(inFlight);
      }
    }

    // Wait for remaining
    await Promise.all(inFlight);

    // Return in original order
    const resultMap = new Map(results.map(r => [r.inventoryId, r]));
    return items.map(item => resultMap.get(item.id)!);
  }
}
