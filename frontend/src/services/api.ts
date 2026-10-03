import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../lib/tokenStorage';
import type { AuthTokens } from '../types';

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** AuthContext registers this so a failed refresh logs the user out of React state. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

const api: AxiosInstance = axios.create({ baseURL: BASE_URL });

// Plain client (no interceptors) so refresh calls cannot loop.
const refreshClient: AxiosInstance = axios.create({ baseURL: BASE_URL });

let refreshPromise: Promise<string> | null = null;

/** Exchange the stored refresh token for new tokens. Concurrent callers share one request. */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return Promise.reject(new Error('No refresh token'));

  refreshPromise = refreshClient
    .post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken })
    .then((res) => {
      tokenStorage.set(res.data.access_token, res.data.refresh_token);
      return res.data.access_token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function isAuthEndpoint(url: string | undefined): boolean {
  return url !== undefined && (url.includes('/auth/login') || url.includes('/auth/refresh'));
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return await api(original);
      } catch {
        tokenStorage.clear();
        unauthorizedHandler?.();
      }
    }
    return Promise.reject(error);
  },
);

export default api;
