import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { EnquiryDetail } from '../components/enquiry/EnquiryDetail';
import { EnquiryList } from '../components/enquiry/EnquiryList';
import { formatEnquiryRef, formatGlobalEnquiryRef } from '../lib/format';
import { makeEnquiry, renderWithProviders } from './testUtils';

describe('formatEnquiryRef', () => {
  it('zero-pads to four digits without truncating', () => {
    expect(formatEnquiryRef(7)).toBe('ENQ-0007');
    expect(formatEnquiryRef(1)).toBe('ENQ-0001');
    expect(formatEnquiryRef(12345)).toBe('ENQ-12345');
  });

  it('prefixes global references with G- so they differ from customer references', () => {
    expect(formatGlobalEnquiryRef(7)).toBe('G-ENQ-0007');
    expect(formatGlobalEnquiryRef(12345)).toBe('G-ENQ-12345');
  });
});

describe('EnquiryList', () => {
  it('shows an empty state when there are no enquiries', () => {
    renderWithProviders(<EnquiryList enquiries={[]} />);
    expect(screen.getByText('No enquiries yet')).toBeInTheDocument();
  });

  it('renders a card linking to each enquiry', () => {
    renderWithProviders(
      <EnquiryList
        enquiries={[
          makeEnquiry({ id: 1 }),
          makeEnquiry({ id: 2, pickup_location: 'Salem', drop_location: 'Ooty', status: 'confirmed' }),
        ]}
      />,
    );

    expect(screen.queryByText('No enquiries yet')).not.toBeInTheDocument();
    expect(screen.getByText('Chennai to Madurai')).toBeInTheDocument();
    expect(screen.getByText('Salem to Ooty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Enquiry ENQ-0002/ })).toHaveAttribute('href', '/enquiries/2');
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('labels a card with the per-user enquiry number but links by id', () => {
    renderWithProviders(<EnquiryList enquiries={[makeEnquiry({ id: 7, enquiry_no: 1 })]} />);

    const link = screen.getByRole('link', { name: /Enquiry ENQ-0001:/ });
    expect(link).toHaveAttribute('href', '/enquiries/7');
  });

  it('falls back to the id reference on a card without enquiry_no', () => {
    renderWithProviders(<EnquiryList enquiries={[makeEnquiry({ id: 7 })]} />);
    expect(screen.getByRole('link', { name: /Enquiry ENQ-0007:/ })).toHaveAttribute('href', '/enquiries/7');
  });

  it('shows both references in the admin variant of the detail', () => {
    renderWithProviders(<EnquiryDetail variant="admin" enquiry={makeEnquiry({ id: 7, enquiry_no: 1 })} />);
    expect(screen.getByText('Customer ENQ')).toBeInTheDocument();
    expect(screen.getByText('ENQ-0001')).toBeInTheDocument();
    expect(screen.getByText('Global ENQ')).toBeInTheDocument();
    expect(screen.getByText('G-ENQ-0007')).toBeInTheDocument();
  });

  it('shows enquiry_no in the detail heading and falls back to id', () => {
    const { unmount } = renderWithProviders(<EnquiryDetail enquiry={makeEnquiry({ id: 7, enquiry_no: 1 })} />);
    expect(screen.getByText('Enquiry ENQ-0001')).toBeInTheDocument();
    unmount();

    renderWithProviders(<EnquiryDetail enquiry={makeEnquiry({ id: 7 })} />);
    expect(screen.getByText('Enquiry ENQ-0007')).toBeInTheDocument();
  });
});
