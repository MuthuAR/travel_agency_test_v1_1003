const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const ACCESS_TOKEN_KEY = ACCESS_KEY;
export const REFRESH_TOKEN_KEY = REFRESH_KEY;

/**
 * Read the `exp` claim of a JWT as epoch milliseconds. Used for timing only;
 * the token is never validated client-side. Returns null if unparseable.
 */
function parseExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const segment = parts[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload: unknown = JSON.parse(atob(padded));
    if (typeof payload !== 'object' || payload === null) return null;
    const exp = (payload as { exp?: unknown }).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Expiry of the stored access token in epoch ms (timing only), or null. */
export function getAccessTokenExpiryMs(): number | null {
  try {
    const token = localStorage.getItem(ACCESS_KEY);
    return token ? parseExpiryMs(token) : null;
  } catch {
    return null;
  }
}
