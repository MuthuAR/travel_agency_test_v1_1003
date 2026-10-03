import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { refreshAccessToken, setUnauthorizedHandler } from '../services/api';
import { authService } from '../services/authService';
import { tokenStorage } from '../lib/tokenStorage';
import type { RegisterPayload, User } from '../types';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMe = useCallback((): Promise<User> => authService.me(), []);

  // Restore session on load.
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async (): Promise<void> => {
      if (!tokenStorage.getAccess()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        tokenStorage.clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [fetchMe]);

  // A failed token refresh (in the api client) clears the session.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string): Promise<User> => {
      const tokens = await authService.login(identifier.trim(), password);
      tokenStorage.set(tokens.access_token, tokens.refresh_token);
      try {
        const me = await fetchMe();
        setUser(me);
        return me;
      } catch (error) {
        tokenStorage.clear();
        throw error;
      }
    },
    [fetchMe],
  );

  /** Creates the account, then signs in with mobile + password. */
  const register = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      await authService.register(payload);
      return login(payload.mobile, payload.password);
    },
    [login],
  );

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefresh();
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } catch {
      // Best-effort revoke; always clear the local session.
    }
    tokenStorage.clear();
    setUser(null);
  }, []);

  /** Rotate tokens and reload the current user. */
  const refresh = useCallback(async (): Promise<void> => {
    await refreshAccessToken();
    setUser(await fetchMe());
  }, [fetchMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refresh,
    }),
    [user, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
