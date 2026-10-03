import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnquiryTable } from '../components/admin/EnquiryTable';
import { EMPTY_FILTERS, FilterBar } from '../components/admin/FilterBar';
import { Pagination } from '../components/admin/Pagination';
import { makeAdminEnquiry, renderWithProviders } from './testUtils';

describe('FilterBar', () => {
  it('applies the selected filters', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithProviders(<FilterBar initial={EMPTY_FILTERS} onApply={onApply} />);

    await user.selectOptions(screen.getByLabelText('Status'), 'confirmed');
    await user.type(screen.getByLabelText('Search'), '  Asha ');
    fireEvent.change(screen.getByLabelText('Start date from'), { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText('Start date to'), { target: { value: '2099-02-01' } });
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({
      status: 'confirmed',
      search: 'Asha',
      start_date_from: '2099-01-01',
      start_date_to: '2099-02-01',
    });
  });

  it('resets all filters', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithProviders(<FilterBar initial={EMPTY_FILTERS} onApply={onApply} />);

    await user.type(screen.getByLabelText('Search'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });
});

describe('Pagination', () => {
  it('disables Previous on the first page and navigates forward', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithProviders(<Pagination page={1} pageSize={10} total={25} onPageChange={onPageChange} />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables Next on the last page and navigates back', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithProviders(<Pagination page={3} pageSize={10} total={25} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe('EnquiryTable', () => {
  it('renders a row per enquiry with customer details and a view link', () => {
    renderWithProviders(
      <EnquiryTable
        enquiries={[
          makeAdminEnquiry({ id: 5 }),
          makeAdminEnquiry({ id: 6, customer: null, status: 'closed' }),
        ]}
      />,
    );

    expect(screen.getByText('Asha Kumar')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View enquiry 5' })).toHaveAttribute(
      'href',
      '/admin/enquiries/5',
    );
  });

  it('shows both the global and customer enquiry references', () => {
    renderWithProviders(<EnquiryTable enquiries={[makeAdminEnquiry({ id: 7, enquiry_no: 1 })]} />);

    expect(screen.getByText('Global ENQ')).toBeInTheDocument();
    expect(screen.getByText('Customer ENQ')).toBeInTheDocument();
    expect(screen.getByText('G-ENQ-0007')).toBeInTheDocument();
    expect(screen.getByText('ENQ-0001')).toBeInTheDocument();
  });

  it('shows an empty message when there are no rows', () => {
    renderWithProviders(<EnquiryTable enquiries={[]} />);
    expect(screen.getByText('No enquiries match your filters.')).toBeInTheDocument();
  });
});
