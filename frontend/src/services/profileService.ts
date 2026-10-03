import api from './api';
import type { CustomerProfile, ProfileUpdatePayload } from '../types';

export const profileService = {
  async getProfile(): Promise<CustomerProfile> {
    const res = await api.get<CustomerProfile>('/profile');
    return res.data;
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<CustomerProfile> {
    const res = await api.put<CustomerProfile>('/profile', payload);
    return res.data;
  },
};
