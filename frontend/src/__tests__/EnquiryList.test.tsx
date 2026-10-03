import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { EnquiryList } from '../components/enquiry/EnquiryList';
import { makeEnquiry, renderWithProviders } from './testUtils';

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
    expect(screen.getByRole('link', { name: /Enquiry 2/ })).toHaveAttribute('href', '/enquiries/2');
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });
});
