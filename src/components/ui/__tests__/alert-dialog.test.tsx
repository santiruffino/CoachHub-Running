import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { NextIntlClientProvider } from 'next-intl';

const messages = {
  common: {
    close: 'Close',
  },
};

describe('AlertDialog', () => {
  it('renders accessible dialog message', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AlertDialog
          open
          onClose={vi.fn()}
          type="warning"
          title="Confirm action"
          message="Are you sure?"
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('fires confirm callback when destructive action is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AlertDialog
          open
          onClose={vi.fn()}
          onConfirm={onConfirm}
          type="warning"
          message="Proceed"
          confirmText="Confirm"
        />
      </NextIntlClientProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
