// components/modals/__tests__/DepthSelectionModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DepthSelectionModal from '../DepthSelectionModal';
import { DepthSuggestion } from '../../../types/contentTemplates';

describe('DepthSelectionModal', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  const mockSuggestion: DepthSuggestion = {
    recommended: 'high-quality',
    reasoning: [
      'Competitors average 2500 words',
      'High SERP difficulty detected',
      'Core topic requires comprehensive coverage',
    ],
    competitorBenchmark: {
      avgWordCount: 2500,
      avgSections: 8,
      topPerformerWordCount: 3200,
    },
    settings: {
      maxSections: 10,
      targetWordCount: { min: 2000, max: 3500 },
      sectionDepth: 'comprehensive',
    },
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSelect: mockOnSelect,
    suggestion: mockSuggestion,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display recommended depth mode', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    // The recommended mode (high-quality) should show "Recommended" badge next to "High Quality"
    expect(screen.getByText(/Recommended/i)).toBeInTheDocument();
    expect(screen.getByText(/High Quality/i)).toBeInTheDocument();
  });

  it('should display competitor benchmark', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    // Check for benchmark labels
    expect(screen.getByText(/Avg\. Words/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg\. Sections/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Performer/i)).toBeInTheDocument();
    // The actual number 8 is displayed for sections
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('should display all three depth options', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    expect(screen.getByText(/High Quality/i)).toBeInTheDocument();
    expect(screen.getByText(/Moderate/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Publish/i)).toBeInTheDocument();
  });

  it('should call onSelect with chosen depth mode', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/Quick Publish/i));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockOnSelect).toHaveBeenCalledWith('quick-publish', undefined);
  });

  it('should display reasoning', () => {
    render(<DepthSelectionModal {...defaultProps} />);

    expect(screen.getByText(/Competitors average 2500 words/)).toBeInTheDocument();
  });
});
