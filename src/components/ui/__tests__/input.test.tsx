import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders by associated label for accessibility', () => {
    render(
      <div>
        <label htmlFor="email">Email</label>
        <Input id="email" type="email" />
      </div>
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('respects disabled prop', () => {
    render(<Input aria-label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});
