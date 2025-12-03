// components/ui/__tests__/PrioritySlider.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrioritySlider } from '../PrioritySlider';

describe('PrioritySlider', () => {
  it('renders with label and value', () => {
    render(
      <PrioritySlider
        label="Human Readability"
        description="Natural flow"
        value={40}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Human Readability')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('calls onChange when slider moves', () => {
    const onChange = vi.fn();
    render(
      <PrioritySlider
        label="Test"
        description="Test"
        value={50}
        onChange={onChange}
      />
    );
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('displays description text', () => {
    render(
      <PrioritySlider
        label="Test"
        description="Test description"
        value={50}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });
});
