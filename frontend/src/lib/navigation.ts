import type { User } from '../types';

export interface RedirectState {
  from?: string;
}

function isRedirectState(state: unknown): state is RedirectState {
  return typeof state === 'object' && state !== null;
}

/** The originally requested route, if it is a safe in-app path. */
export function getRequestedPath(state: unknown): string | undefined {
  if (!isRedirectState(state)) return undefined;
  const from = state.from;
  // Same-site absolute path only. Browsers treat `\` like `/`, so `/\evil.com` and `//evil.com`
  // would be external redirects; control characters are rejected as well.
  if (typeof from === 'string' && /^\/(?![/\\])[^\\\u0000-\u001f]*$/.test(from)) return from;
  return undefined;
}

/** Where to send a user after signing in. */
export function getPostLoginPath(user: User, state: unknown): string {
  const requested = getRequestedPath(state);
  if (user.role === 'admin') {
    return requested?.startsWith('/admin') ? requested : '/admin/enquiries';
  }
  return requested && !requested.startsWith('/admin') ? requested : '/dashboard';
}
