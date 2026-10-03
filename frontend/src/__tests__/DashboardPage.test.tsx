import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../pages/DashboardPage';
import { enquiryService } from '../services/enquiryService';
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
  enquiryService: {
    list: vi.fn(),
  },
}));

const getProfile = vi.mocked(profileService.getProfile);
const list = vi.mocked(enquiryService.list);

describe('DashboardPage greeting', () => {
  beforeEach(() => {
    getProfile.mockReset();
    list.mockReset();
    list.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 10 });
  });

  it('greets the customer by profile name', async () => {
    getProfile.mockResolvedValue(makeCustomer({ name: 'Asha Kumar' }));
    renderWithAuth(<DashboardPage />, { auth: makeAuth({ user: makeUser({ mobile: '9988776655' }) }) });

    expect(await screen.findByRole('heading', { name: 'Welcome back, Asha Kumar' })).toBeInTheDocument();
  });

  it('falls back to the mobile number when the profile cannot be loaded', async () => {
    getProfile.mockRejectedValue(new Error('Profile unavailable'));
    renderWithAuth(<DashboardPage />, { auth: makeAuth({ user: makeUser({ mobile: '9988776655' }) }) });

    expect(await screen.findByRole('heading', { name: 'Welcome back, 9988776655' })).toBeInTheDocument();
    expect(screen.queryByText('Profile unavailable')).not.toBeInTheDocument();
  });
});
