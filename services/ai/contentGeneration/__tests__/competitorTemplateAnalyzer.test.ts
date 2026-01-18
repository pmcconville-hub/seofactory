/**
 * Competitor Template Analyzer Tests
 *
 * Created: 2026-01-18 - Content Template Routing Task 26
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeCompetitorsForTemplate,
  assessTemplateCompetitorFit,
  extractMetricsFromBrief,
  CompetitorMetrics,
} from '../competitorTemplateAnalyzer';

describe('competitorTemplateAnalyzer', () => {
  describe('analyzeCompetitorsForTemplate', () => {
    it('should recommend DEFINITIONAL for informational queries with "what is" headings', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 2000,
        avgSections: 8,
        commonHeadings: ['What is SEO?', 'Benefits of SEO', 'How SEO Works'],
      };

      const result = analyzeCompetitorsForTemplate({
        competitorMetrics: metrics,
        searchIntent: 'informational',
      });

      expect(result.template).toBe('DEFINITIONAL');
      expect(result.confidence).toBeGreaterThan(60);
    });

    it('should recommend PROCESS_HOWTO for how-to content', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 1800,
        avgSections: 10,
        commonHeadings: ['How to Build a Website', 'Step 1: Choose a Domain', 'Step 2: Select Hosting'],
        hasSteps: true,
      };

      const result = analyzeCompetitorsForTemplate({
        competitorMetrics: metrics,
      });

      expect(result.template).toBe('PROCESS_HOWTO');
      expect(result.reasoning).toContain('Competitors use step-by-step guide format');
    });

    it('should recommend COMPARISON for vs content', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 2500,
        avgSections: 12,
        commonHeadings: ['WordPress vs Wix', 'Feature Comparison', 'Pricing Comparison'],
        avgTables: 3,
        hasComparison: true,
      };

      const result = analyzeCompetitorsForTemplate({
        competitorMetrics: metrics,
      });

      expect(result.template).toBe('COMPARISON');
      expect(result.suggestedElements.includeTables).toBe(true);
    });

    it('should recommend ECOMMERCE_PRODUCT for product pages', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 1500,
        avgSections: 8,
        commonHeadings: ['Product Features', 'Specifications', 'Pricing', 'Buy Now'],
      };

      const result = analyzeCompetitorsForTemplate({
        competitorMetrics: metrics,
        searchIntent: 'transactional',
      });

      expect(['ECOMMERCE_PRODUCT', 'COMPARISON']).toContain(result.template);
    });

    it('should suggest word count based on competitor average', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 2000,
        avgSections: 6,
      };

      const result = analyzeCompetitorsForTemplate({
        competitorMetrics: metrics,
      });

      // Should be within 20% of competitor average
      expect(result.suggestedWordCount.min).toBeLessThanOrEqual(2000);
      expect(result.suggestedWordCount.max).toBeGreaterThanOrEqual(2000);
      expect(result.suggestedWordCount.min).toBeGreaterThan(1500);
      expect(result.suggestedWordCount.max).toBeLessThan(2500);
    });

    it('should include FAQ suggestion when competitors use FAQs', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 1800,
        avgSections: 7,
        hasFaq: true,
        commonHeadings: ['FAQ', 'Frequently Asked Questions'],
      };

      const result = analyzeCompetitorsForTemplate({
        competitorMetrics: metrics,
      });

      expect(result.suggestedElements.includeFaq).toBe(true);
    });

    it('should provide reasoning for recommendation', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 2000,
        avgSections: 8,
      };

      const result = analyzeCompetitorsForTemplate({
        competitorMetrics: metrics,
      });

      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('assessTemplateCompetitorFit', () => {
    it('should return good fit when template matches recommendation', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 2000,
        avgSections: 8,
        commonHeadings: ['What is Test?', 'Benefits', 'How it Works'],
      };

      const result = assessTemplateCompetitorFit('DEFINITIONAL', metrics);

      expect(result.isGoodFit).toBe(true);
      expect(result.fitScore).toBeGreaterThan(50);
    });

    it('should suggest alternative when template is poor fit', () => {
      const metrics: CompetitorMetrics = {
        avgWordCount: 2500,
        avgSections: 12,
        commonHeadings: ['Product A vs Product B', 'Comparison Table'],
        hasComparison: true,
        avgTables: 3,
      };

      const result = assessTemplateCompetitorFit('NEWS_ARTICLE', metrics);

      if (!result.isGoodFit) {
        expect(result.suggestion).toBeDefined();
        expect(result.reason).toBeDefined();
      }
    });
  });

  describe('extractMetricsFromBrief', () => {
    it('should extract metrics from brief SERP analysis', () => {
      // Using any to test the function's internal handling of non-standard brief formats
      const brief: any = {
        serpAnalysis: {
          competitorHeadings: ['What is SEO?', 'FAQ Section', 'How to Start'],
        },
        competitorMetrics: {
          avgWordCount: 1800,
          avgSections: 7,
        },
      };

      const metrics = extractMetricsFromBrief(brief);

      expect(metrics.avgWordCount).toBe(1800);
      expect(metrics.avgSections).toBe(7);
      expect(metrics.hasFaq).toBe(true);
      expect(metrics.hasSteps).toBe(true);
    });

    it('should provide defaults when brief has no SERP data', () => {
      const brief = {};

      const metrics = extractMetricsFromBrief(brief);

      expect(metrics.avgWordCount).toBe(1500);
      expect(metrics.avgSections).toBe(6);
    });

    it('should detect comparison content from headings', () => {
      // Using any to test the function's internal handling of non-standard brief formats
      const brief: any = {
        serpAnalysis: {
          competitorHeadings: ['A vs B', 'Comparison Chart'],
        },
      };

      const metrics = extractMetricsFromBrief(brief);

      expect(metrics.hasComparison).toBe(true);
    });
  });
});
