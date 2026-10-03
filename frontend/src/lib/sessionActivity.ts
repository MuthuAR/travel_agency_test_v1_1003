export const LAST_ACTIVITY_KEY = 'last_activity';

/** Shared (cross-tab) last-activity timestamp in epoch ms, or null. */
export function readLastActivity(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLastActivity(timestamp: number): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
  } catch {
    // Storage unavailable; the in-memory clock still works for this tab.
  }
}

export function clearLastActivity(): void {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // Ignore.
  }
}
