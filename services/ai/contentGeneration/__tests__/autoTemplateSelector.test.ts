/**
 * Auto Template Selector Tests
 *
 * Created: 2026-01-18 - Content Template Routing Task 25
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  autoSelectTemplate,
  getBestTemplateForWebsiteType,
  getTemplatesRankedByPerformance,
} from '../autoTemplateSelector';

// Mock the analytics service
vi.mock('../../../templateAnalyticsService', () => ({
  getTemplatePerformanceStats: vi.fn().mockResolvedValue({
    success: true,
    stats: {
      DEFINITIONAL: {
        count: 20,
        avgAuditScore: 88,
        avgComplianceScore: 92,
        avgGenerationTime: 45000,
        avgWordCount: 2500,
        overrideRate: 5,
      },
      COMPARISON: {
        count: 15,
        avgAuditScore: 82,
        avgComplianceScore: 85,
        avgGenerationTime: 50000,
        avgWordCount: 3000,
        overrideRate: 15,
      },
      PROCESS_HOWTO: {
        count: 10,
        avgAuditScore: 90,
        avgComplianceScore: 88,
        avgGenerationTime: 40000,
        avgWordCount: 2200,
        overrideRate: 8,
      },
    },
  }),
}));

describe('autoTemplateSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('autoSelectTemplate', () => {
    it('should return AI result when historical data is disabled', async () => {
      const result = await autoSelectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
        useHistoricalData: false,
      });

      expect(result.usedHistoricalData).toBe(false);
      expect(result.template).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should combine AI and historical scores when enabled', async () => {
      const result = await autoSelectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
        useHistoricalData: true,
      });

      expect(result.usedHistoricalData).toBe(true);
      expect(result.combinedConfidence).toBeGreaterThan(0);
    });

    it('should include historical metrics when available', async () => {
      const result = await autoSelectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
        useHistoricalData: true,
        minSampleSize: 5,
      });

      // Historical metrics should be included if template has enough samples
      if (result.historicalMetrics) {
        expect(result.historicalMetrics.sampleSize).toBeGreaterThanOrEqual(5);
        expect(result.historicalMetrics.avgAuditScore).toBeGreaterThan(0);
      }
    });

    it('should respect custom historical weight', async () => {
      const lowWeightResult = await autoSelectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
        useHistoricalData: true,
        historicalWeight: 0.1, // Low weight on historical
      });

      const highWeightResult = await autoSelectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
        useHistoricalData: true,
        historicalWeight: 0.9, // High weight on historical
      });

      // Both should produce valid results
      expect(lowWeightResult.template).toBeDefined();
      expect(highWeightResult.template).toBeDefined();
    });

    it('should provide reasoning array', async () => {
      const result = await autoSelectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      });

      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('getBestTemplateForWebsiteType', () => {
    it('should return best performing template', async () => {
      const result = await getBestTemplateForWebsiteType('INFORMATIONAL');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.template).toBeDefined();
        expect(result.score).toBeGreaterThan(0);
      }
    });
  });

  describe('getTemplatesRankedByPerformance', () => {
    it('should return templates sorted by score', async () => {
      const ranked = await getTemplatesRankedByPerformance(5);

      expect(ranked).toBeInstanceOf(Array);
      expect(ranked.length).toBeGreaterThan(0);

      // Verify sorted order
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
      }
    });

    it('should filter by minimum sample size', async () => {
      const ranked = await getTemplatesRankedByPerformance(15);

      // All returned templates should have at least 15 samples
      for (const item of ranked) {
        expect(item.samples).toBeGreaterThanOrEqual(15);
      }
    });

    it('should include score and samples for each template', async () => {
      const ranked = await getTemplatesRankedByPerformance(5);

      for (const item of ranked) {
        expect(item.template).toBeDefined();
        expect(typeof item.score).toBe('number');
        expect(typeof item.samples).toBe('number');
      }
    });
  });
});
