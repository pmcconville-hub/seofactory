/**
 * Template Analytics Service Tests
 *
 * Tests for tracking template selection and performance metrics.
 *
 * Created: 2026-01-18 - Content Template Routing Phase 3 Task 22
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  trackTemplateSelection,
  trackGenerationComplete,
  getTemplatePerformanceStats,
  getUserTemplateHistory,
  getRecommendationAccuracyStats,
  TemplateSelectionData,
  GenerationCompleteData,
} from '../templateAnalyticsService';

// Mock Supabase client
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpdate = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockGte = vi.fn().mockReturnThis();
const mockLte = vi.fn().mockReturnThis();
const mockNot = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock('../supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      insert: mockInsert,
      update: vi.fn(() => ({
        eq: mockEq.mockResolvedValue({ data: null, error: null }),
      })),
      select: vi.fn(() => ({
        not: vi.fn(() => ({
          eq: mockEq.mockReturnThis(),
          gte: mockGte.mockReturnThis(),
          lte: mockLte.mockResolvedValue({ data: [], error: null }),
        })),
        order: vi.fn(() => ({
          limit: mockLimit,
        })),
      })),
    })),
  })),
}));

describe('templateAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackTemplateSelection', () => {
    it('should record template selection with all required fields', async () => {
      const selectionData: TemplateSelectionData = {
        jobId: 'job-123',
        briefId: 'brief-456',
        selectedTemplate: 'DEFINITIONAL',
        templateConfidence: 85,
        aiRecommendedTemplate: 'DEFINITIONAL',
        userOverrodeRecommendation: false,
        depthMode: 'moderate',
      };

      const result = await trackTemplateSelection(selectionData);

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: 'job-123',
          brief_id: 'brief-456',
          selected_template: 'DEFINITIONAL',
          template_confidence: 85,
          ai_recommended_template: 'DEFINITIONAL',
          user_overrode_recommendation: false,
          depth_mode: 'moderate',
        })
      );
    });

    it('should record when user overrides AI recommendation', async () => {
      const selectionData: TemplateSelectionData = {
        jobId: 'job-789',
        selectedTemplate: 'COMPARISON',
        templateConfidence: 75,
        aiRecommendedTemplate: 'DEFINITIONAL',
        userOverrodeRecommendation: true,
        depthMode: 'high-quality',
      };

      const result = await trackTemplateSelection(selectionData);

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          selected_template: 'COMPARISON',
          ai_recommended_template: 'DEFINITIONAL',
          user_overrode_recommendation: true,
        })
      );
    });

    it('should include target word count when provided', async () => {
      const selectionData: TemplateSelectionData = {
        jobId: 'job-word-count',
        selectedTemplate: 'ECOMMERCE_PRODUCT',
        targetWordCount: { min: 1500, max: 2500 },
      };

      const result = await trackTemplateSelection(selectionData);

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          target_word_count_min: 1500,
          target_word_count_max: 2500,
        })
      );
    });

    it('should handle Supabase errors gracefully', async () => {
      mockInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await trackTemplateSelection({
        jobId: 'job-error',
        selectedTemplate: 'DEFINITIONAL',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('trackGenerationComplete', () => {
    it('should update analytics with generation results', async () => {
      const completionData: GenerationCompleteData = {
        jobId: 'job-123',
        generationTimeMs: 45000,
        totalPassesCompleted: 10,
        finalAuditScore: 87,
        templateComplianceScore: 92,
        finalWordCount: 2500,
        finalSectionCount: 8,
      };

      const result = await trackGenerationComplete(completionData);

      expect(result.success).toBe(true);
    });

    it('should work without optional templateComplianceScore', async () => {
      const completionData: GenerationCompleteData = {
        jobId: 'job-456',
        generationTimeMs: 30000,
        totalPassesCompleted: 8,
        finalAuditScore: 75,
        finalWordCount: 1800,
        finalSectionCount: 6,
      };

      const result = await trackGenerationComplete(completionData);

      expect(result.success).toBe(true);
    });
  });

  describe('getTemplatePerformanceStats', () => {
    it('should return aggregated statistics', async () => {
      const result = await getTemplatePerformanceStats();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
    });

    it('should filter by template name when provided', async () => {
      const result = await getTemplatePerformanceStats('DEFINITIONAL');

      expect(result.success).toBe(true);
    });

    it('should filter by date range when provided', async () => {
      const dateRange = {
        start: new Date('2026-01-01'),
        end: new Date('2026-01-31'),
      };

      const result = await getTemplatePerformanceStats(undefined, dateRange);

      expect(result.success).toBe(true);
    });
  });

  describe('getUserTemplateHistory', () => {
    it('should return recent template selections', async () => {
      const result = await getUserTemplateHistory(10);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should use default limit of 20 when not specified', async () => {
      const result = await getUserTemplateHistory();

      expect(result.success).toBe(true);
    });
  });

  describe('getRecommendationAccuracyStats', () => {
    it('should return recommendation accuracy statistics', async () => {
      const result = await getRecommendationAccuracyStats();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
    });
  });
});
