/**
 * TemplateConfirmationFlow Component Tests
 *
 * Tests the multi-step template selection flow that guides users through
 * template selection, depth configuration, and conflict resolution before
 * content generation begins.
 *
 * Created: 2026-01-18 - Content Template Routing Phase 3 Task 19
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplateConfirmationFlow from '../TemplateConfirmationFlow';

// Mock the template routing services
vi.mock('../../../services/ai/contentGeneration/templateRouter', () => ({
  selectTemplate: vi.fn(() => ({
    template: {
      templateName: 'DEFINITIONAL',
      label: 'Definitional Content',
      description: 'For defining concepts and entities',
      minSections: 4,
      maxSections: 8,
      stylometry: 'ACADEMIC_FORMAL',
      sectionStructure: [],
      formatCodeDefaults: {},
      csiPredicates: [],
    },
    confidence: 85,
    reasoning: ['Matches informational intent', 'Good for core topics'],
    alternatives: [
      { templateName: 'PROCESS_HOWTO', reason: 'Could work for procedural content' },
    ],
  })),
}));

vi.mock('../../../services/ai/contentGeneration/depthAnalyzer', () => ({
  analyzeAndSuggestDepth: vi.fn(() => ({
    recommended: 'moderate' as const,
    competitorBenchmark: {
      avgWordCount: 1500,
      avgSections: 6,
      topPerformerWordCount: 2500,
    },
    reasoning: ['Balanced depth for this topic', 'Matches competitor average'],
  })),
}));

vi.mock('../../../services/ai/contentGeneration/conflictResolver', () => ({
  detectConflicts: vi.fn(() => ({
    hasConflicts: false,
    conflicts: [],
    aiRecommendation: {
      action: 'use-template' as const,
      reasoning: ['No conflicts detected'],
    },
  })),
}));

vi.mock('../../../config/contentTemplates', () => ({
  getTemplateByName: vi.fn((name: string) => ({
    templateName: name,
    label: `${name} Template`,
    description: `Description for ${name}`,
    minSections: 4,
    maxSections: 8,
    stylometry: 'ACADEMIC_FORMAL',
    sectionStructure: [],
    formatCodeDefaults: {},
    csiPredicates: [],
  })),
}));

describe('TemplateConfirmationFlow', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  const mockBrief = {
    id: 'brief-123',
    title: 'Test Article',
    search_intent: 'informational',
    query_type: 'definitional',
    topic_type: 'core',
    topic_class: 'informational',
    structured_outline: [
      { heading: 'What is Test?', level: 2 },
      { heading: 'Benefits', level: 2 },
    ],
  };

  const mockBusinessInfo = {
    websiteType: 'INFORMATIONAL',
    language: 'en',
    authorityScore: 50,
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    brief: mockBrief as any,
    businessInfo: mockBusinessInfo as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show template selection modal', async () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    // Should show template selection (may show loading briefly first, then template)
    await waitFor(() => {
      expect(screen.getByText(/Select Content Template/i)).toBeInTheDocument();
    });
  });

  it('should show template selection after analysis', async () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/AI Recommendation/i)).toBeInTheDocument();
    });
  });

  it('should call onClose when cancelled', async () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display template selection with confidence and reasoning', async () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    // Wait for template selection to show
    await waitFor(() => {
      expect(screen.getByText(/AI Recommendation/i)).toBeInTheDocument();
    });

    // Should show confidence score
    expect(screen.getByText(/85/)).toBeInTheDocument();

    // Should show template name (may appear multiple times)
    const templateNames = screen.getAllByText(/DEFINITIONAL/);
    expect(templateNames.length).toBeGreaterThan(0);

    // Should have confirm button
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('should display alternatives when available', async () => {
    render(<TemplateConfirmationFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Alternative Templates/i)).toBeInTheDocument();
    });

    // Should show the alternative template section with at least one alternative
    const alternatives = screen.getAllByText(/PROCESS_HOWTO/);
    expect(alternatives.length).toBeGreaterThan(0);
  });
});
