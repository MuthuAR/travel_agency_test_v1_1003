import api from './api';
import type { AuthTokens, RegisterPayload, User } from '../types';

export const authService = {
  async login(identifier: string, password: string): Promise<AuthTokens> {
    const res = await api.post<AuthTokens>('/auth/login', { identifier, password });
    return res.data;
  },

  /** Creates the account only; the backend returns the user, not tokens. */
  async register(payload: RegisterPayload): Promise<User> {
    const res = await api.post<User>('/auth/register', payload);
    return res.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refresh_token: refreshToken });
  },

  async me(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};
