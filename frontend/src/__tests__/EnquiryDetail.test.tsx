import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { EnquiryDetail } from '../components/enquiry/EnquiryDetail';
import { makeEnquiry, makePassenger, renderWithProviders } from './testUtils';

describe('EnquiryDetail travellers', () => {
  it('lists employees and the additional count for an organization enquiry', () => {
    const enquiry = makeEnquiry({
      adults_count: 5,
      kids_count: 0,
      additional_travellers_count: 3,
      passengers: [
        makePassenger({ id: 1, position: 1, name: 'Ravi Kumar', mobile: '9123456780' }),
        makePassenger({
          id: 2,
          position: 2,
          name: 'Meena S',
          mobile: '9876543210',
          gender: 'female',
          spoken_languages: ['Hindi', 'Urdu'],
          communication_mediums: ['sms'],
        }),
      ],
    });
    renderWithProviders(<EnquiryDetail enquiry={enquiry} />);

    expect(screen.getByText('Travellers')).toBeInTheDocument();
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('9123456780')).toBeInTheDocument();
    expect(screen.getByText('English, Tamil')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp, Email')).toBeInTheDocument();
    expect(screen.getByText('Meena S')).toBeInTheDocument();
    expect(screen.getByText('Hindi, Urdu')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Additional travellers: 3')).toBeInTheDocument();
    expect(screen.getByText('Total travellers')).toBeInTheDocument();
    expect(screen.queryByText('Adults')).not.toBeInTheDocument();
    expect(screen.queryByText('Kids')).not.toBeInTheDocument();
  });

  it('omits the additional line when the count is zero', () => {
    const enquiry = makeEnquiry({
      additional_travellers_count: 0,
      passengers: [makePassenger()],
    });
    renderWithProviders(<EnquiryDetail enquiry={enquiry} />);

    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.queryByText(/Additional travellers/)).not.toBeInTheDocument();
  });

  it('renders a personal enquiry exactly as before', () => {
    renderWithProviders(<EnquiryDetail enquiry={makeEnquiry({ passengers: [] })} />);

    expect(screen.getByText('Adults')).toBeInTheDocument();
    expect(screen.getByText('Kids')).toBeInTheDocument();
    expect(screen.queryByText('Travellers')).not.toBeInTheDocument();
    expect(screen.queryByText('Total travellers')).not.toBeInTheDocument();
    expect(screen.queryByText(/Additional travellers/)).not.toBeInTheDocument();
  });
});
