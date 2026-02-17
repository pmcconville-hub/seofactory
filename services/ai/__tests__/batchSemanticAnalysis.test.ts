import { describe, it, expect, vi } from 'vitest';
import { BatchSemanticAnalysisService, BatchSemanticProgress } from '../batchSemanticAnalysis';

describe('BatchSemanticAnalysisService', () => {
  it('should process pages sequentially with progress callbacks', async () => {
    const mockAnalyze = vi.fn().mockResolvedValue({
      overallScore: 75,
      coreEntities: { centralEntity: 'Test CE', searchIntent: 'Learn testing', detectedSourceContext: 'Tech blog' },
      actions: [],
      analyzedAt: new Date().toISOString(),
    });

    const service = new BatchSemanticAnalysisService({
      analyzeFn: mockAnalyze,
      concurrency: 1,
    });

    const progressUpdates: BatchSemanticProgress[] = [];
    const items = [
      { id: 'inv-1', url: 'https://example.com/page1', content: 'Page 1 content' },
      { id: 'inv-2', url: 'https://example.com/page2', content: 'Page 2 content' },
    ];

    const results = await service.analyze(items, (p) => progressUpdates.push({ ...p }));

    expect(mockAnalyze).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results[0].inventoryId).toBe('inv-1');
    expect(results[0].detectedCE).toBe('Test CE');
    expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
    expect(progressUpdates[progressUpdates.length - 1].completed).toBe(2);
  });

  it('should skip pages that already have cached results', async () => {
    const mockAnalyze = vi.fn().mockResolvedValue({
      overallScore: 80,
      coreEntities: { centralEntity: 'CE', searchIntent: 'Intent', detectedSourceContext: 'SC' },
      actions: [],
      analyzedAt: new Date().toISOString(),
    });

    const mockCheckCache = vi.fn()
      .mockResolvedValueOnce({ overallScore: 90, coreEntities: { centralEntity: 'Cached CE', searchIntent: 'Cached Intent', detectedSourceContext: 'Cached SC' }, actions: [], analyzedAt: new Date().toISOString(), summary: '', macroAnalysis: { contextualVector: '', hierarchy: '', sourceContext: '' }, microAnalysis: { sentenceStructure: '', informationDensity: '', htmlSemantics: '' } })
      .mockResolvedValueOnce(null);

    const service = new BatchSemanticAnalysisService({
      analyzeFn: mockAnalyze,
      concurrency: 1,
      checkCacheFn: mockCheckCache,
    });

    const items = [
      { id: 'inv-1', url: 'https://example.com/page1', content: 'Page 1' },
      { id: 'inv-2', url: 'https://example.com/page2', content: 'Page 2' },
    ];

    const results = await service.analyze(items);

    expect(mockAnalyze).toHaveBeenCalledTimes(1); // Only uncached
    expect(results).toHaveLength(2);
    expect(results[0].detectedCE).toBe('Cached CE'); // From cache
    expect(results[1].detectedCE).toBe('CE'); // Freshly analyzed
  });

  it('should handle analysis failures gracefully', async () => {
    const mockAnalyze = vi.fn()
      .mockResolvedValueOnce({
        overallScore: 75,
        coreEntities: { centralEntity: 'CE1', searchIntent: 'Intent', detectedSourceContext: 'SC' },
        actions: [],
        analyzedAt: new Date().toISOString(),
      })
      .mockRejectedValueOnce(new Error('API failure'));

    const service = new BatchSemanticAnalysisService({
      analyzeFn: mockAnalyze,
      concurrency: 1,
    });

    const items = [
      { id: 'inv-1', url: 'https://example.com/page1', content: 'Page 1' },
      { id: 'inv-2', url: 'https://example.com/page2', content: 'Page 2' },
    ];

    const results = await service.analyze(items);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBe('API failure');
  });

  it('should respect concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const mockAnalyze = vi.fn().mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 50));
      concurrent--;
      return {
        overallScore: 75,
        coreEntities: { centralEntity: 'CE', searchIntent: 'Intent', detectedSourceContext: 'SC' },
        actions: [],
        analyzedAt: new Date().toISOString(),
      };
    });

    const service = new BatchSemanticAnalysisService({
      analyzeFn: mockAnalyze,
      concurrency: 2,
    });

    const items = Array.from({ length: 6 }, (_, i) => ({
      id: `inv-${i}`,
      url: `https://example.com/page${i}`,
      content: `Page ${i}`,
    }));

    await service.analyze(items);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(mockAnalyze).toHaveBeenCalledTimes(6);
  });
});
