import type { ReactElement } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../context/AuthContext';
import type { User } from '../types';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    mobile: '9876543210',
    email: null,
    role: 'customer',
    is_active: true,
    ...overrides,
  };
}

export function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const user = overrides.user ?? null;
  return {
    user,
    isLoading: false,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'admin',
    login: vi.fn<AuthContextValue['login']>().mockResolvedValue(makeUser()),
    register: vi.fn<AuthContextValue['register']>().mockResolvedValue(makeUser()),
    logout: vi.fn<AuthContextValue['logout']>().mockResolvedValue(undefined),
    refresh: vi.fn<AuthContextValue['refresh']>().mockResolvedValue(undefined),
    ...overrides,
  };
}

interface RenderOptions {
  auth?: AuthContextValue;
  route?: string;
}

export function renderWithAuth(ui: ReactElement, options: RenderOptions = {}): RenderResult {
  const { auth = makeAuth(), route = '/' } = options;
  return render(
    <ChakraProvider>
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>
      </MemoryRouter>
    </ChakraProvider>,
  );
}
