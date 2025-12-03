import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationModal from './ConfirmationModal';

describe('ConfirmationModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  it('renders when isOpen is true', () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('calls onConfirm when Confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(<ConfirmationModal {...defaultProps} onConfirm={handleConfirm} />);

    await user.click(screen.getByText('Confirm'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<ConfirmationModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<ConfirmationModal {...defaultProps} onClose={handleClose} />);

    // Click the backdrop (the overlay behind the modal)
    const backdrop = screen.getByText('Confirm Action').closest('.fixed');
    if (backdrop) {
      await user.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onClose when modal content is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<ConfirmationModal {...defaultProps} onClose={handleClose} />);

    // Click inside the modal content
    await user.click(screen.getByText('Are you sure you want to proceed?'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders with custom title', () => {
    render(<ConfirmationModal {...defaultProps} title="Delete Item" />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<ConfirmationModal {...defaultProps} message="This action cannot be undone." />);
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('renders with ReactNode message', () => {
    const message = (
      <div>
        <strong>Warning:</strong> This is important
      </div>
    );
    render(<ConfirmationModal {...defaultProps} message={message} />);
    expect(screen.getByText('Warning:')).toBeInTheDocument();
    expect(screen.getByText('This is important')).toBeInTheDocument();
  });

  it('displays warning icon', () => {
    render(<ConfirmationModal {...defaultProps} />);
    const warningIcon = screen.getByText('Confirm Action')
      .closest('.text-center')
      ?.querySelector('.text-yellow-400');
    expect(warningIcon).toBeInTheDocument();
  });

  it('has correct button styling', () => {
    render(<ConfirmationModal {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toHaveClass('bg-gray-600');

    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-red-600');
  });

  it('has proper modal overlay styling', () => {
    render(<ConfirmationModal {...defaultProps} />);
    const overlay = screen.getByText('Confirm Action').closest('.fixed');
    expect(overlay).toHaveClass('inset-0');
    expect(overlay).toHaveClass('bg-black');
    expect(overlay).toHaveClass('bg-opacity-70');
    expect(overlay).toHaveClass('z-[60]');
  });

  it('renders both action buttons', () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('prevents event propagation from modal card to backdrop', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<ConfirmationModal {...defaultProps} onClose={handleClose} />);

    // Get the card element (modal content)
    const card = screen.getByText('Confirm Action').closest('.bg-gray-800\\/50');

    if (card) {
      await user.click(card);
      // onClose should not be called because stopPropagation prevents backdrop click
      expect(handleClose).not.toHaveBeenCalled();
    }
  });
});
