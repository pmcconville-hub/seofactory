import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBanner } from './NotificationBanner';

// Mock timers for testing auto-dismiss
vi.useFakeTimers();

describe('NotificationBanner Component', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('renders message when provided', () => {
    render(<NotificationBanner message="Test notification" onDismiss={() => {}} />);
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });

  it('does not render when message is null', () => {
    const { container } = render(<NotificationBanner message={null} onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    // Use real timers for this test since we need actual DOM interaction
    vi.useRealTimers();
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    render(<NotificationBanner message="Dismissible message" onDismiss={handleDismiss} />);

    const dismissButton = screen.getByText('×');
    await user.click(dismissButton);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
    vi.useFakeTimers(); // Switch back to fake timers
  });

  it('auto-dismisses after 5 seconds', () => {
    const handleDismiss = vi.fn();
    render(<NotificationBanner message="Auto dismiss test" onDismiss={handleDismiss} />);

    expect(screen.getByText('Auto dismiss test')).toBeInTheDocument();
    expect(handleDismiss).not.toHaveBeenCalled();

    // Fast-forward time by 5 seconds
    vi.advanceTimersByTime(5000);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('clears timer when message changes to null', () => {
    const handleDismiss = vi.fn();
    const { rerender } = render(
      <NotificationBanner message="First message" onDismiss={handleDismiss} />
    );

    expect(screen.getByText('First message')).toBeInTheDocument();

    // Change message to null before timer expires
    rerender(<NotificationBanner message={null} onDismiss={handleDismiss} />);

    // Fast-forward time
    vi.advanceTimersByTime(5000);

    // onDismiss should not be called because timer was cleared
    expect(handleDismiss).not.toHaveBeenCalled();
  });

  it('resets timer when message changes', () => {
    const handleDismiss = vi.fn();
    const { rerender } = render(
      <NotificationBanner message="First message" onDismiss={handleDismiss} />
    );

    expect(screen.getByText('First message')).toBeInTheDocument();

    // Fast-forward 3 seconds
    vi.advanceTimersByTime(3000);

    // Change message - this should reset the timer
    rerender(<NotificationBanner message="Second message" onDismiss={handleDismiss} />);

    expect(screen.getByText('Second message')).toBeInTheDocument();

    // Fast-forward another 3 seconds (total 6, but timer was reset)
    vi.advanceTimersByTime(3000);

    // Should not dismiss yet since timer was reset
    expect(handleDismiss).not.toHaveBeenCalled();

    // Fast-forward remaining 2 seconds to reach 5 seconds from reset
    vi.advanceTimersByTime(2000);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('has correct styling classes', () => {
    render(<NotificationBanner message="Styled notification" onDismiss={() => {}} />);
    // Get the outer container div with the fixed positioning
    const outerBanner = screen.getByText('Styled notification').closest('.fixed');
    expect(outerBanner).toHaveClass('fixed');
    expect(outerBanner).toHaveClass('top-0');
    expect(outerBanner).toHaveClass('bg-blue-900/80');
    expect(outerBanner).toHaveClass('backdrop-blur-sm');
  });

  it('displays dismiss button with correct styling', () => {
    render(<NotificationBanner message="Test message" onDismiss={() => {}} />);
    const dismissButton = screen.getByText('×');
    expect(dismissButton).toHaveClass('text-lg');
    expect(dismissButton).toHaveClass('hover:text-gray-300');
  });
});
