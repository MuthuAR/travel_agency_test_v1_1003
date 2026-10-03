import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { clearLastActivity, writeLastActivity } from '../lib/sessionActivity';
import { EXPIRED_NOTICE, setLoginNoticeIfAbsent } from '../lib/sessionNotice';
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
  const userRef = useRef<User | null>(null);

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

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /** Forced sign-out (refresh rejected): leave a notice for customers on the login page. */
  const expireSession = useCallback((): void => {
    if (typeof userRef.current?.idle_timeout_minutes === 'number') {
      setLoginNoticeIfAbsent(EXPIRED_NOTICE);
    }
    clearLastActivity();
    setUser(null);
  }, []);

  // A failed token refresh (in the api client) clears the session.
  useEffect(() => {
    setUnauthorizedHandler(expireSession);
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<User> => {
      const tokens = await authService.login(identifier.trim(), password);
      tokenStorage.set(tokens.access_token, tokens.refresh_token);
      try {
        const me = await fetchMe();
        writeLastActivity(Date.now());
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
    clearLastActivity();
    setUser(null);
  }, []);

  /** Rotate tokens and reload the current user. A rejected refresh ends the session. */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      await refreshAccessToken();
    } catch (error) {
      const networkOrServer =
        axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
      if (!networkOrServer) {
        tokenStorage.clear();
        expireSession();
      }
      throw error;
    }
    setUser(await fetchMe());
  }, [fetchMe, expireSession]);

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
