import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileForm } from '../components/profile/ProfileForm';
import { profileService } from '../services/profileService';
import type { CustomerProfile } from '../types';
import { renderWithAuth } from './authTestUtils';

vi.mock('../services/profileService', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const baseProfile: CustomerProfile = {
  id: 1,
  user_id: 1,
  account_type: 'personal',
  organization_name: null,
  name: 'Jane Doe',
  gender: 'female',
  spoken_languages: ['English', 'Urdu'],
  communication_mediums: ['sms'],
  address: '12 Beach Road',
  mobile: '9876543210',
  email: 'jane@example.com',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const getProfile = vi.mocked(profileService.getProfile);
const updateProfile = vi.mocked(profileService.updateProfile);

describe('ProfileForm', () => {
  beforeEach(() => {
    getProfile.mockReset();
    updateProfile.mockReset();
    getProfile.mockResolvedValue(baseProfile);
  });

  it('loads the profile into read-only fields', async () => {
    renderWithAuth(<ProfileForm />);

    expect(await screen.findByDisplayValue('Jane Doe')).toBeDisabled();
    expect(screen.getByDisplayValue('9876543210')).toBeDisabled();
    expect(screen.getByDisplayValue('Urdu')).toBeInTheDocument();
    expect(screen.getByLabelText('English')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
  });

  it('shows an error when the profile cannot be loaded', async () => {
    getProfile.mockRejectedValue(new Error('Profile unavailable'));
    renderWithAuth(<ProfileForm />);

    expect(await screen.findByText('Profile unavailable')).toBeInTheDocument();
  });

  it('saves edits via updateProfile', async () => {
    const user = userEvent.setup();
    updateProfile.mockResolvedValue({ ...baseProfile, name: 'Jane Smith' });
    renderWithAuth(<ProfileForm />);

    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    const nameInput = screen.getByLabelText('Full name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Smith');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile).toHaveBeenCalledWith({
      name: 'Jane Smith',
      gender: 'female',
      spoken_languages: ['English', 'Urdu'],
      communication_mediums: ['sms'],
      address: '12 Beach Road',
      mobile: '9876543210',
      email: 'jane@example.com',
    });
    expect(await screen.findByText('Profile updated')).toBeInTheDocument();
  });

  it('preserves a previously saved non-standard language in the other field', async () => {
    const user = userEvent.setup();
    getProfile.mockResolvedValue({ ...baseProfile, spoken_languages: ['Tamil', 'Telugu'] });
    updateProfile.mockResolvedValue(baseProfile);
    renderWithAuth(<ProfileForm />);

    expect(await screen.findByDisplayValue('Telugu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ spoken_languages: ['Tamil', 'Telugu'] }),
    );
  });

  it('saves multiple communication mediums and blocks saving with none', async () => {
    const user = userEvent.setup();
    updateProfile.mockResolvedValue(baseProfile);
    renderWithAuth(<ProfileForm />);

    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    await user.click(screen.getByLabelText('SMS'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Select at least one communication medium')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText('Email'));
    await user.click(screen.getByLabelText('WhatsApp'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ communication_mediums: ['whatsapp', 'email'] }),
    );
  });

  it('blocks saving when a required field is cleared', async () => {
    const user = userEvent.setup();
    renderWithAuth(<ProfileForm />);

    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    await user.clear(screen.getByLabelText('Full name'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('shows a personal account read-only without an organization field', async () => {
    renderWithAuth(<ProfileForm />);

    expect(await screen.findByTestId('account-type-value')).toHaveTextContent('Personal');
    expect(screen.queryByLabelText('Organization name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('lets organization accounts edit the organization name and never sends account_type', async () => {
    const user = userEvent.setup();
    const orgProfile: CustomerProfile = {
      ...baseProfile,
      account_type: 'organization',
      organization_name: 'Acme Travels',
    };
    getProfile.mockResolvedValue(orgProfile);
    updateProfile.mockResolvedValue({ ...orgProfile, organization_name: 'Acme Holidays' });
    renderWithAuth(<ProfileForm />);

    expect(await screen.findByTestId('account-type-value')).toHaveTextContent('Organization');
    expect(screen.getByLabelText('Organization name')).toBeDisabled();
    expect(screen.getByLabelText('Staff name')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const orgInput = screen.getByLabelText('Organization name');
    await user.clear(orgInput);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Organization name is required')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();

    await user.type(orgInput, 'Acme Holidays');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ organization_name: 'Acme Holidays', name: 'Jane Doe' }),
    );
    expect(updateProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({ account_type: expect.anything() }),
    );
  });

  it('discards changes on cancel', async () => {
    const user = userEvent.setup();
    renderWithAuth(<ProfileForm />);

    await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
    await user.type(screen.getByLabelText('Full name'), ' Extra');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByDisplayValue('Jane Doe')).toBeDisabled();
  });
});
