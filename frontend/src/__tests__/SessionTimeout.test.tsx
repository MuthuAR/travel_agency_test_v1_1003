import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionTimeoutManager } from '../components/auth/SessionTimeoutManager';
import { IDLE_NOTICE, consumeLoginNotice, setLoginNotice } from '../lib/sessionNotice';
import { getAccessTokenExpiryMs } from '../lib/tokenStorage';
import { makeAuth, makeUser, renderWithAuth } from './authTestUtils';
import type { AuthContextValue } from '../context/AuthContext';

const MINUTE = 60_000;

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function renderManager(idle: number | null | undefined, role: 'customer' | 'admin' = 'customer') {
  const user = makeUser({ role, idle_timeout_minutes: idle });
  const auth: AuthContextValue = makeAuth({ user });
  renderWithAuth(<SessionTimeoutManager />, { auth });
  return auth;
}

describe('session timeout (customer)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('warns at 14 minutes of inactivity and logs out at 15', async () => {
    const auth = renderManager(15);

    await advance(13 * MINUTE);
    expect(screen.queryByText(/signed out in/i)).not.toBeInTheDocument();

    await advance(MINUTE);
    expect(screen.getByText(/signed out in 60 seconds/i)).toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();

    await advance(5_000);
    expect(screen.getByText(/signed out in 55 seconds/i)).toBeInTheDocument();

    await advance(MINUTE);
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(consumeLoginNotice()).toBe(IDLE_NOTICE);
  });

  it('resets the idle clock on activity', async () => {
    const auth = renderManager(15);

    await advance(10 * MINUTE);
    fireEvent.mouseMove(document);

    await advance(10 * MINUTE);
    expect(screen.queryByText(/signed out in/i)).not.toBeInTheDocument();

    await advance(4 * MINUTE);
    expect(screen.getByText(/signed out in/i)).toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('keeps the dialog open on activity and "Stay signed in" dismisses and resets', async () => {
    const auth = renderManager(15);

    await advance(14 * MINUTE);
    expect(screen.getByText(/signed out in/i)).toBeInTheDocument();

    fireEvent.mouseMove(document);
    fireEvent.keyDown(document, { key: 'a' });
    expect(screen.getByText(/signed out in/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /stay signed in/i }));
    expect(screen.queryByText(/signed out in/i)).not.toBeInTheDocument();

    await advance(10 * MINUTE);
    expect(screen.queryByText(/signed out in/i)).not.toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('refreshes proactively while active when the access token is near expiry', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    localStorage.setItem('access_token', `${btoa('{}')}.${btoa(JSON.stringify({ exp }))}.sig`);
    const auth = renderManager(15);

    await advance(2_000);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when the token is not near expiry', async () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    localStorage.setItem('access_token', `${btoa('{}')}.${btoa(JSON.stringify({ exp }))}.sig`);
    const auth = renderManager(15);

    await advance(5_000);
    expect(auth.refresh).not.toHaveBeenCalled();
  });
});

describe('session timeout (admin)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never warns or logs out an admin (null timeout)', async () => {
    const auth = renderManager(null, 'admin');
    await advance(60 * MINUTE);
    expect(screen.queryByText(/signed out in/i)).not.toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it('ignores users without idle_timeout_minutes', async () => {
    const auth = renderManager(undefined);
    await advance(60 * MINUTE);
    expect(screen.queryByText(/signed out in/i)).not.toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});

describe('login notice helper', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reads and clears the message', () => {
    setLoginNotice(IDLE_NOTICE);
    expect(consumeLoginNotice()).toBe(IDLE_NOTICE);
    expect(consumeLoginNotice()).toBeNull();
  });
});

describe('getAccessTokenExpiryMs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('parses the exp claim in milliseconds', () => {
    const payload = btoa(JSON.stringify({ exp: 1_700_000_000 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    localStorage.setItem('access_token', `h.${payload}.s`);
    expect(getAccessTokenExpiryMs()).toBe(1_700_000_000_000);
  });

  it('returns null for missing or malformed tokens', () => {
    expect(getAccessTokenExpiryMs()).toBeNull();
    localStorage.setItem('access_token', 'not-a-jwt');
    expect(getAccessTokenExpiryMs()).toBeNull();
  });
});
