import type { ReactElement } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AdminEnquiry, CustomerProfile, Enquiry, EnquiryPassenger } from '../types';

/** Render with Chakra and a router (no auth context). Auth-aware tests use authTestUtils. */
export function renderWithProviders(ui: ReactElement, route = '/'): RenderResult {
  return render(
    <ChakraProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ChakraProvider>,
  );
}

export function makeEnquiry(overrides: Partial<Enquiry> = {}): Enquiry {
  return {
    id: 1,
    user_id: 1,
    start_date: '2099-01-10',
    end_date: '2099-01-15',
    pickup_location: 'Chennai',
    drop_location: 'Madurai',
    travel_routes: 'Chennai - Trichy - Madurai',
    adults_count: 2,
    kids_count: 1,
    vehicle_preference: 'SUV',
    others: null,
    status: 'new',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

export function makeCustomer(overrides: Partial<CustomerProfile> = {}): CustomerProfile {
  return {
    id: 1,
    user_id: 1,
    account_type: 'personal',
    organization_name: null,
    name: 'Asha Kumar',
    gender: 'female',
    spoken_languages: ['English', 'Tamil'],
    communication_mediums: ['whatsapp', 'sms'],
    address: '12 Beach Road, Chennai',
    mobile: '9876543210',
    email: 'asha@example.com',
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

export function makePassenger(overrides: Partial<EnquiryPassenger> = {}): EnquiryPassenger {
  return {
    id: 1,
    position: 1,
    name: 'Ravi Kumar',
    mobile: '9123456780',
    gender: 'male',
    spoken_languages: ['English', 'Tamil'],
    communication_mediums: ['whatsapp', 'email'],
    ...overrides,
  };
}

export function makeAdminEnquiry(overrides: Partial<AdminEnquiry> = {}): AdminEnquiry {
  return { ...makeEnquiry(), customer: makeCustomer(), ...overrides };
}
