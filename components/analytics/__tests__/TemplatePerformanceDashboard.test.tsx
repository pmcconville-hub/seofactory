/**
 * Template Performance Dashboard Tests
 *
 * Created: 2026-01-18 - Content Template Routing Task 24
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TemplatePerformanceDashboard } from '../TemplatePerformanceDashboard';

// Mock the analytics services
vi.mock('../../../services/templateAnalyticsService', () => ({
  getTemplatePerformanceStats: vi.fn().mockResolvedValue({
    success: true,
    stats: {
      DEFINITIONAL: {
        count: 10,
        avgAuditScore: 85,
        avgComplianceScore: 90,
        avgGenerationTime: 45000,
        avgWordCount: 2500,
        overrideRate: 10,
      },
    },
  }),
  getRecommendationAccuracyStats: vi.fn().mockResolvedValue({
    success: true,
    stats: {
      totalSelections: 20,
      acceptedRecommendations: 15,
      overriddenRecommendations: 5,
      avgScoreWhenAccepted: 85,
      avgScoreWhenOverridden: 80,
    },
  }),
  getUserTemplateHistory: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
}));

vi.mock('../../../services/templateABTestService', () => ({
  listABTests: vi.fn().mockResolvedValue([]),
  getABTestResults: vi.fn().mockResolvedValue(null),
}));

describe('TemplatePerformanceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dashboard title', async () => {
    render(<TemplatePerformanceDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Template Performance')).toBeInTheDocument();
    });
  });

  it('should show date range filters', async () => {
    render(<TemplatePerformanceDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('Last 90 days')).toBeInTheDocument();
      expect(screen.getByText('All time')).toBeInTheDocument();
    });
  });

  it('should display template statistics when data is loaded', async () => {
    render(<TemplatePerformanceDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Template Usage & Performance')).toBeInTheDocument();
    });
  });

  it('should display AI recommendation accuracy section', async () => {
    render(<TemplatePerformanceDashboard />);

    await waitFor(() => {
      expect(screen.getByText('AI Recommendation Accuracy')).toBeInTheDocument();
    });
  });

  it('should show total generations stat', async () => {
    render(<TemplatePerformanceDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Generations')).toBeInTheDocument();
    });
  });
});
