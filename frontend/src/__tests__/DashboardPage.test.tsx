import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '../pages/DashboardPage';
import { enquiryService } from '../services/enquiryService';
import { profileService } from '../services/profileService';
import { makeAuth, makeUser, renderWithAuth } from './authTestUtils';
import { makeCustomer, makeEnquiry } from './testUtils';

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

describe('DashboardPage filters', () => {
  beforeEach(() => {
    getProfile.mockReset();
    getProfile.mockResolvedValue(makeCustomer({ name: 'Asha Kumar' }));
    list.mockReset();
    list.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 10 });
  });

  it('shows the empty state when unfiltered and there are no enquiries', async () => {
    renderWithAuth(<DashboardPage />, { auth: makeAuth({ user: makeUser() }) });

    expect(await screen.findByText('No enquiries yet')).toBeInTheDocument();
    expect(screen.queryByText('No enquiries match your filters.')).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(1, 10, {});
  });

  it('passes the applied filters to the service and shows the no-match message', async () => {
    const user = userEvent.setup();
    renderWithAuth(<DashboardPage />, { auth: makeAuth({ user: makeUser() }) });
    await screen.findByText('No enquiries yet');

    await user.selectOptions(screen.getByLabelText('Status'), 'confirmed');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('No enquiries match your filters.')).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(1, 10, { status: 'confirmed' });
    expect(screen.queryByText('No enquiries yet')).not.toBeInTheDocument();
    expect(screen.getByText('0 enquiries found')).toBeInTheDocument();
  });

  it('clears the filters from the no-match message', async () => {
    const user = userEvent.setup();
    renderWithAuth(<DashboardPage />, { auth: makeAuth({ user: makeUser() }) });
    await screen.findByText('No enquiries yet');

    await user.selectOptions(screen.getByLabelText('Status'), 'ack');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText('No enquiries match your filters.');

    const resets = screen.getAllByRole('button', { name: 'Reset' });
    await user.click(resets[resets.length - 1]);

    expect(await screen.findByText('No enquiries yet')).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(1, 10, {});
    expect(screen.getByLabelText('Status')).toHaveValue('');
  });

  it('reports the number of matching enquiries', async () => {
    const user = userEvent.setup();
    list.mockResolvedValue({
      items: [makeEnquiry({ id: 1 }), makeEnquiry({ id: 2 })],
      total: 2,
      page: 1,
      page_size: 10,
    });
    renderWithAuth(<DashboardPage />, { auth: makeAuth({ user: makeUser() }) });
    await screen.findAllByText('Chennai to Madurai');

    await user.selectOptions(screen.getByLabelText('Status'), 'new');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('2 enquiries found')).toBeInTheDocument();
  });
});
