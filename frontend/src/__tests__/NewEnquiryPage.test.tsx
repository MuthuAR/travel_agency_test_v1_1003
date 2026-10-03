import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewEnquiryPage from '../pages/NewEnquiryPage';
import { profileService } from '../services/profileService';
import { makeAuth, makeUser, renderWithAuth } from './authTestUtils';
import { makeCustomer } from './testUtils';

vi.mock('../services/profileService', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock('../services/enquiryService', () => ({
  enquiryService: { create: vi.fn(), list: vi.fn(), get: vi.fn() },
}));

const getProfile = vi.mocked(profileService.getProfile);

function renderPage(): void {
  renderWithAuth(<NewEnquiryPage />, { auth: makeAuth({ user: makeUser() }) });
}

describe('NewEnquiryPage', () => {
  beforeEach(() => {
    getProfile.mockReset();
  });

  it('shows the organization form for an organization profile', async () => {
    getProfile.mockResolvedValue(
      makeCustomer({
        account_type: 'organization',
        organization_name: 'Acme Travels',
        gender: null,
        spoken_languages: [],
        communication_mediums: [],
      }),
    );
    renderPage();

    expect(await screen.findByRole('group', { name: 'Employee 1' })).toBeInTheDocument();
    expect(screen.getByText('Total travellers: 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Adults')).not.toBeInTheDocument();
  });

  it('shows the personal form for a personal profile', async () => {
    getProfile.mockResolvedValue(makeCustomer());
    renderPage();

    expect(await screen.findByLabelText('Adults')).toBeInTheDocument();
    expect(screen.getByLabelText('Kids')).toBeInTheDocument();
    expect(screen.queryByText('Travellers')).not.toBeInTheDocument();
  });

  it('shows an error when the profile cannot be loaded', async () => {
    getProfile.mockRejectedValue(new Error('Profile unavailable'));
    renderPage();

    expect(await screen.findByText('Profile unavailable')).toBeInTheDocument();
    expect(screen.queryByLabelText('Adults')).not.toBeInTheDocument();
  });
});
