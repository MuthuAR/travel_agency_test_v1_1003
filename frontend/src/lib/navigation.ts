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
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from;
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
