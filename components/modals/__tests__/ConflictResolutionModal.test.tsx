// components/modals/__tests__/ConflictResolutionModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConflictResolutionModal from '../ConflictResolutionModal';
import { ConflictDetectionResult } from '../../../types/contentTemplates';

describe('ConflictResolutionModal', () => {
  const mockOnResolve = vi.fn();
  const mockOnClose = vi.fn();

  const mockDetection: ConflictDetectionResult = {
    hasConflicts: true,
    conflicts: [
      {
        field: 'formatCode',
        briefValue: 'PROSE',
        templateValue: 'FS',
        severity: 'critical',
        semanticSeoArgument: 'Featured Snippet format has 2-3x higher CTR for definitional queries.',
      },
      {
        field: 'formatCode',
        briefValue: 'PROSE',
        templateValue: 'LISTING',
        severity: 'moderate',
        semanticSeoArgument: 'List format has 47% higher Featured Snippet win rate.',
      },
    ],
    overallSeverity: 'critical',
    aiRecommendation: {
      action: 'use-template',
      reasoning: [
        'Critical conflicts detected - template format codes optimize for search visibility',
        'Featured Snippet format has higher CTR',
      ],
    },
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onResolve: mockOnResolve,
    detection: mockDetection,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display conflicts with severity', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    // Check that severity labels are displayed (multiple occurrences expected)
    expect(screen.getAllByText(/critical/i).length).toBeGreaterThan(0);
    // Check Featured Snippet argument appears in conflict display
    expect(screen.getAllByText(/Featured Snippet/).length).toBeGreaterThan(0);
  });

  it('should display AI recommendation', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    // AI Recommends: Use Template should be displayed in the recommendation section
    expect(screen.getByText(/AI Recommends.*Use Template/i)).toBeInTheDocument();
  });

  it('should display resolution options', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByText(/Use Template Values/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep Brief Values/i)).toBeInTheDocument();
  });

  it('should call onResolve with template choice', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/Use Template Values/i));
    fireEvent.click(screen.getByText(/Apply Resolution/i));

    expect(mockOnResolve).toHaveBeenCalledWith('template');
  });

  it('should call onResolve with brief choice', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/Keep Brief Values/i));
    fireEvent.click(screen.getByText(/Apply Resolution/i));

    expect(mockOnResolve).toHaveBeenCalledWith('brief');
  });
});
