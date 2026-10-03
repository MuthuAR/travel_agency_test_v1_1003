import { useCallback, useEffect, useRef, useState } from 'react';
import { clearLastActivity, readLastActivity, writeLastActivity } from '../lib/sessionActivity';
import { ACCESS_TOKEN_KEY, getAccessTokenExpiryMs } from '../lib/tokenStorage';

/** Show the warning dialog when this much idle time remains. */
export const WARNING_MS = 60_000;
/** Refresh proactively when the access token has less than this left. */
const REFRESH_AHEAD_MS = 120_000;
/** Minimum gap between keep-alive attempts (avoids hammering on network errors). */
const REFRESH_RETRY_MS = 15_000;
const TICK_MS = 1_000;
const ACTIVITY_THROTTLE_MS = 1_000;

const ACTIVITY_EVENTS: readonly string[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

interface UseSessionTimeoutOptions {
  /** Idle timeout in minutes; null/undefined disables everything (admins). */
  idleMinutes: number | null | undefined;
  /** Called once when the full idle timeout elapses. */
  onIdleExpire: () => void;
  /** Called to refresh tokens while the user is active. */
  onKeepAlive: () => Promise<void>;
  /** Called when the tokens were removed in another tab. */
  onTokensRemoved: () => void;
}

export interface SessionTimeoutState {
  /** Seconds until sign-out while the warning is showing, otherwise null. */
  secondsLeft: number | null;
  /** Acknowledge the warning: counts as activity and closes the dialog. */
  stayActive: () => void;
}

export function useSessionTimeout({
  idleMinutes,
  onIdleExpire,
  onKeepAlive,
  onTokensRemoved,
}: UseSessionTimeoutOptions): SessionTimeoutState {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const expireRef = useRef(onIdleExpire);
  const keepAliveRef = useRef(onKeepAlive);
  const removedRef = useRef(onTokensRemoved);
  const stayRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    expireRef.current = onIdleExpire;
    keepAliveRef.current = onKeepAlive;
    removedRef.current = onTokensRemoved;
  }, [onIdleExpire, onKeepAlive, onTokensRemoved]);

  const timeoutMs =
    typeof idleMinutes === 'number' && idleMinutes > 0 ? idleMinutes * 60_000 : 0;
  const enabled = timeoutMs > 0;

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(null);
      return undefined;
    }

    const stored = readLastActivity();
    let last = stored ?? Date.now();
    if (stored === null) writeLastActivity(last);

    let lastWrite = 0;
    let expired = false;
    let warning = false;
    let refreshing = false;
    let lastRefreshAttempt = 0;

    const currentLast = (): number => {
      const shared = readLastActivity();
      if (shared !== null && shared > last) last = shared;
      return last;
    };

    const markActivity = (): void => {
      // While the warning is open only the button counts, so the user acknowledges it.
      if (warning || expired) return;
      const now = Date.now();
      last = now;
      if (now - lastWrite >= ACTIVITY_THROTTLE_MS) {
        writeLastActivity(now);
        lastWrite = now;
      }
    };

    stayRef.current = (): void => {
      if (expired) return;
      const now = Date.now();
      last = now;
      writeLastActivity(now);
      lastWrite = now;
      warning = false;
      setSecondsLeft(null);
    };

    const tick = (): void => {
      if (expired) return;
      const now = Date.now();
      const remaining = timeoutMs - (now - currentLast());

      if (remaining <= 0) {
        expired = true;
        warning = false;
        setSecondsLeft(null);
        clearLastActivity();
        expireRef.current();
        return;
      }

      if (remaining <= WARNING_MS) {
        warning = true;
        setSecondsLeft(Math.ceil(remaining / 1000));
        return;
      }

      warning = false;
      setSecondsLeft(null);

      // Keep-alive: the user is active, so refresh before the access token lapses.
      const expiry = getAccessTokenExpiryMs();
      if (
        expiry !== null &&
        expiry - now <= REFRESH_AHEAD_MS &&
        !refreshing &&
        now - lastRefreshAttempt >= REFRESH_RETRY_MS
      ) {
        refreshing = true;
        lastRefreshAttempt = now;
        keepAliveRef
          .current()
          .catch(() => undefined)
          .finally(() => {
            refreshing = false;
          });
      }
    };

    const onStorage = (event: StorageEvent): void => {
      // key === null means localStorage.clear(); newValue === null means removal.
      if (event.key === null || (event.key === ACCESS_TOKEN_KEY && event.newValue === null)) {
        removedRef.current();
      }
    };

    const listenerOptions: AddEventListenerOptions = { passive: true, capture: true };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActivity, listenerOptions));
    window.addEventListener('storage', onStorage);
    const interval = setInterval(tick, TICK_MS);
    tick();

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((name) =>
        window.removeEventListener(name, markActivity, listenerOptions),
      );
      window.removeEventListener('storage', onStorage);
      stayRef.current = () => undefined;
    };
  }, [enabled, timeoutMs]);

  const stayActive = useCallback((): void => {
    stayRef.current();
  }, []);

  return { secondsLeft, stayActive };
}
