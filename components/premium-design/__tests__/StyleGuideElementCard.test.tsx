import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StyleGuideElementCard } from '../StyleGuideElementCard';
import type { StyleGuideElement } from '../../../types/styleGuide';

function makeElement(overrides: Partial<StyleGuideElement> = {}): StyleGuideElement {
  return {
    id: 'el-1',
    category: 'buttons',
    subcategory: 'primary-button',
    label: 'Primary Button (Inter Bold 16px)',
    pageRegion: 'main',
    outerHtml: '<button class="btn">Click me</button>',
    computedCss: { color: '#ffffff', backgroundColor: '#6b21a8' },
    selfContainedHtml: '<button style="color:#fff;background:#6b21a8;padding:8px 16px;border-radius:4px;">Click me</button>',
    selector: '.btn',
    elementTag: 'button',
    classNames: ['btn'],
    approvalStatus: 'pending',
    ...overrides,
  };
}

const noopApprove = vi.fn();
const noopReject = vi.fn();
const noopComment = vi.fn();

describe('StyleGuideElementCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders quick action buttons when onRefine is provided and not refining', () => {
    const onRefine = vi.fn();
    render(
      <StyleGuideElementCard
        element={makeElement()}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onRefine={onRefine}
        isRefining={false}
      />
    );
    expect(screen.getByText('Quick:')).toBeDefined();
    expect(screen.getByText('Match colors')).toBeDefined();
    expect(screen.getByText('Fix contrast')).toBeDefined();
    expect(screen.getByText('Match font')).toBeDefined();
    expect(screen.getByText('Fix spacing')).toBeDefined();
  });

  it('does not render quick action buttons when onRefine is not provided', () => {
    render(
      <StyleGuideElementCard
        element={makeElement()}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
      />
    );
    expect(screen.queryByText('Quick:')).toBeNull();
  });

  it('does not render quick action buttons when isRefining is true', () => {
    const onRefine = vi.fn();
    render(
      <StyleGuideElementCard
        element={makeElement()}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onRefine={onRefine}
        isRefining={true}
      />
    );
    expect(screen.queryByText('Quick:')).toBeNull();
  });

  it('calls onRefine with correct comment when quick action is clicked', () => {
    const onRefine = vi.fn();
    render(
      <StyleGuideElementCard
        element={makeElement()}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onRefine={onRefine}
        isRefining={false}
      />
    );
    fireEvent.click(screen.getByText('Match colors'));
    expect(onRefine).toHaveBeenCalledWith('el-1', 'Match the brand colors more closely. Use the approved color palette.');
  });

  it('shows undo button after HTML change when onUndo is provided', () => {
    const onUndo = vi.fn();
    const element = makeElement();

    const { rerender } = render(
      <StyleGuideElementCard
        element={element}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onUndo={onUndo}
      />
    );

    // Initially no undo button
    expect(screen.queryByText('Undo')).toBeNull();

    // Re-render with changed HTML to trigger the "Updated" + "Undo" indicators
    const updatedElement = { ...element, selfContainedHtml: '<button style="color:#000;">Updated</button>' };
    rerender(
      <StyleGuideElementCard
        element={updatedElement}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onUndo={onUndo}
      />
    );

    expect(screen.getByText('Undo')).toBeDefined();
    expect(screen.getByText('Updated')).toBeDefined();
  });

  it('calls onUndo when undo button is clicked', () => {
    const onUndo = vi.fn();
    const element = makeElement();

    const { rerender } = render(
      <StyleGuideElementCard
        element={element}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onUndo={onUndo}
      />
    );

    // Trigger HTML change
    const updatedElement = { ...element, selfContainedHtml: '<button>Changed</button>' };
    rerender(
      <StyleGuideElementCard
        element={updatedElement}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onUndo={onUndo}
      />
    );

    fireEvent.click(screen.getByText('Undo'));
    expect(onUndo).toHaveBeenCalledWith('el-1');
  });

  it('hides undo button after 10 seconds', () => {
    const onUndo = vi.fn();
    const element = makeElement();

    const { rerender } = render(
      <StyleGuideElementCard
        element={element}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onUndo={onUndo}
      />
    );

    // Trigger HTML change
    const updatedElement = { ...element, selfContainedHtml: '<button>Changed</button>' };
    rerender(
      <StyleGuideElementCard
        element={updatedElement}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
        onUndo={onUndo}
      />
    );

    expect(screen.getByText('Undo')).toBeDefined();

    // Advance time by 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.queryByText('Undo')).toBeNull();
  });

  it('shows refinement history badge with correct count', () => {
    const element = makeElement({
      refinementHistory: [
        { timestamp: '2026-01-01T00:00:00Z', comment: 'Fix colors', previousHtml: '<button>Old 1</button>' },
        { timestamp: '2026-01-02T00:00:00Z', comment: 'Fix spacing', previousHtml: '<button>Old 2</button>' },
        { timestamp: '2026-01-03T00:00:00Z', comment: 'Fix font', previousHtml: '<button>Old 3</button>' },
      ],
    });

    render(
      <StyleGuideElementCard
        element={element}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
      />
    );

    expect(screen.getByText('Refined 3x')).toBeDefined();
  });

  it('does not show refinement history badge when history is empty', () => {
    const element = makeElement({ refinementHistory: [] });

    render(
      <StyleGuideElementCard
        element={element}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
      />
    );

    expect(screen.queryByText(/Refined \d+x/)).toBeNull();
  });

  it('does not show refinement history badge when history is undefined', () => {
    const element = makeElement();

    render(
      <StyleGuideElementCard
        element={element}
        onApprove={noopApprove}
        onReject={noopReject}
        onComment={noopComment}
      />
    );

    expect(screen.queryByText(/Refined \d+x/)).toBeNull();
  });
});
