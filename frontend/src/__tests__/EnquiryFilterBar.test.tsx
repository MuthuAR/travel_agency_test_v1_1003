import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnquiryFilterBar } from '../components/enquiry/EnquiryFilterBar';
import { renderWithProviders } from './testUtils';

describe('EnquiryFilterBar', () => {
  it('applies year, month and status as typed values', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const year = new Date().getFullYear();
    renderWithProviders(<EnquiryFilterBar onApply={onApply} />);

    await user.selectOptions(screen.getByLabelText('Year'), String(year - 1));
    await user.selectOptions(screen.getByLabelText('Month'), 'March');
    await user.selectOptions(screen.getByLabelText('Status'), 'ack');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ year: year - 1, month: 3, status: 'ack' });
  });

  it('offers the current year and three before it', () => {
    const year = new Date().getFullYear();
    renderWithProviders(<EnquiryFilterBar onApply={vi.fn()} />);
    const select = screen.getByLabelText('Year');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toEqual([
      'All years',
      String(year),
      String(year - 1),
      String(year - 2),
      String(year - 3),
    ]);
  });

  it('disables and clears year and month when a date is selected', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const year = new Date().getFullYear();
    renderWithProviders(<EnquiryFilterBar onApply={onApply} />);

    await user.selectOptions(screen.getByLabelText('Year'), String(year));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-03' } });

    expect(screen.getByLabelText('Year')).toBeDisabled();
    expect(screen.getByLabelText('Month')).toBeDisabled();
    expect(screen.getByLabelText('Year')).toHaveValue('');
    expect(screen.getByText('A specific date overrides the year and month.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith({ date: '2026-10-03' });
  });

  it('shows the helper text about the submitted date', () => {
    renderWithProviders(<EnquiryFilterBar onApply={vi.fn()} />);
    expect(screen.getByText('Filters use the date you submitted the enquiry.')).toBeInTheDocument();
  });

  it('resets every field and applies empty filters', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithProviders(<EnquiryFilterBar onApply={onApply} />);

    await user.selectOptions(screen.getByLabelText('Status'), 'confirmed');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-03' } });
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onApply).toHaveBeenCalledWith({});
    expect(screen.getByLabelText('Status')).toHaveValue('');
    expect(screen.getByLabelText('Date')).toHaveValue('');
    expect(screen.getByLabelText('Year')).toBeEnabled();
  });
});
