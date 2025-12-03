import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);

    const input = screen.getByPlaceholderText('Type here');
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('calls onChange handler when user types', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="Type here" />);

    const input = screen.getByPlaceholderText('Type here');
    await user.type(input, 'Test');

    expect(handleChange).toHaveBeenCalledTimes(4); // Once per character
  });

  it('respects disabled state', async () => {
    const user = userEvent.setup();
    render(<Input disabled placeholder="Disabled input" />);

    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();

    await user.type(input, 'Should not type');
    expect(input).toHaveValue('');
  });

  it('applies custom className along with base classes', () => {
    render(<Input className="custom-input" placeholder="Custom" />);
    const input = screen.getByPlaceholderText('Custom');
    expect(input).toHaveClass('custom-input');
    expect(input).toHaveClass('w-full');
    expect(input).toHaveClass('bg-gray-800');
  });

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" placeholder="Number" />);
    expect(screen.getByPlaceholderText('Number')).toHaveAttribute('type', 'number');
  });

  it('sets value when value prop is provided', () => {
    render(<Input value="Controlled value" onChange={() => {}} />);
    expect(screen.getByDisplayValue('Controlled value')).toBeInTheDocument();
  });

  it('supports default value for uncontrolled inputs', () => {
    render(<Input defaultValue="Default text" />);
    expect(screen.getByDisplayValue('Default text')).toBeInTheDocument();
  });

  it('has proper styling classes for focus and border', () => {
    render(<Input placeholder="Styled input" />);
    const input = screen.getByPlaceholderText('Styled input');
    expect(input).toHaveClass('border-gray-600');
    expect(input).toHaveClass('focus:ring-2');
    expect(input).toHaveClass('focus:ring-blue-500');
    expect(input).toHaveClass('rounded-lg');
  });

  it('passes through HTML input attributes', () => {
    render(
      <Input
        placeholder="Attributes test"
        data-testid="test-input"
        maxLength={10}
        required
      />
    );
    const input = screen.getByTestId('test-input');
    expect(input).toHaveAttribute('maxLength', '10');
    expect(input).toHaveAttribute('required');
  });
});
