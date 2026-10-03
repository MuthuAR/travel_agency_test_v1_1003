const NOTICE_KEY = 'session_notice';

export const IDLE_NOTICE = 'You were signed out because of inactivity.';
export const EXPIRED_NOTICE = 'Your session has expired. Please sign in again.';

/** Remember a message to show on the login page after a forced sign-out. */
export function setLoginNotice(message: string): void {
  try {
    sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    // Storage unavailable; the notice is simply skipped.
  }
}

/** Like setLoginNotice, but keeps a more specific notice that is already pending. */
export function setLoginNoticeIfAbsent(message: string): void {
  try {
    if (sessionStorage.getItem(NOTICE_KEY) === null) sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    // Storage unavailable; the notice is simply skipped.
  }
}

/** Return the pending login notice (if any) and clear it. */
export function consumeLoginNotice(): string | null {
  try {
    const message = sessionStorage.getItem(NOTICE_KEY);
    if (message !== null) sessionStorage.removeItem(NOTICE_KEY);
    return message;
  } catch {
    return null;
  }
}
