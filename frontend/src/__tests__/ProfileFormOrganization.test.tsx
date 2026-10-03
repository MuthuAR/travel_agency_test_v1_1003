import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileForm } from '../components/profile/ProfileForm';
import { profileService } from '../services/profileService';
import { renderWithAuth } from './authTestUtils';
import { makeCustomer } from './testUtils';

vi.mock('../services/profileService', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const getProfile = vi.mocked(profileService.getProfile);
const updateProfile = vi.mocked(profileService.updateProfile);

describe('ProfileForm organization account', () => {
  beforeEach(() => {
    getProfile.mockReset();
    updateProfile.mockReset();
  });

  it('hides gender, languages and communication, and omits them from the payload', async () => {
    const user = userEvent.setup();
    const orgProfile = makeCustomer({
      account_type: 'organization',
      organization_name: 'Acme Travels',
      name: 'Jane Doe',
      gender: null,
      spoken_languages: [],
      communication_mediums: [],
    });
    getProfile.mockResolvedValue(orgProfile);
    updateProfile.mockResolvedValue(orgProfile);
    renderWithAuth(<ProfileForm />);

    expect(await screen.findByLabelText('Staff name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Gender')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('English')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('WhatsApp')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    const sent = updateProfile.mock.calls[0][0];
    expect('gender' in sent).toBe(false);
    expect('spoken_languages' in sent).toBe(false);
    expect('communication_mediums' in sent).toBe(false);
    expect(sent.name).toBe('Jane Doe');
  });
});
