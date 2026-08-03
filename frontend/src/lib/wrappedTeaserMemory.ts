export type WrappedTeaserState = {
  dismissedAt?: string;
};

const STORAGE_PREFIX = 'ninety.wrappedTeaser:v1:';
/** Soft dismiss: ocultar el teaser grande durante 7 días. */
export const WRAPPED_TEASER_SOFT_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readWrappedTeaserState(userId: string): WrappedTeaserState | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as WrappedTeaserState;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

export function dismissWrappedTeaser(userId: string): WrappedTeaserState | null {
  if (!userId) return null;
  const next: WrappedTeaserState = { dismissedAt: new Date().toISOString() };
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
}

export function shouldShowWrappedTeaser(state: WrappedTeaserState | null): boolean {
  if (!state?.dismissedAt) return true;
  const dismissedAt = Date.parse(state.dismissedAt);
  if (!Number.isFinite(dismissedAt)) return true;
  return Date.now() - dismissedAt >= WRAPPED_TEASER_SOFT_DISMISS_MS;
}
