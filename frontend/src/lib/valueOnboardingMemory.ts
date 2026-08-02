export type ValueOnboardingState = {
  dismissedAt?: string;
  dismissPermanent?: boolean;
  /** Primera visita válida a `/u/:username/vs` (no self / guest). */
  compareVisitedAt?: string;
};

const STORAGE_PREFIX = 'ninety.valueOnboarding:v1:';
/** Soft dismiss: no volver a mostrar durante 7 días. */
export const VALUE_ONBOARDING_SOFT_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readValueOnboardingState(userId: string): ValueOnboardingState | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ValueOnboardingState;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function writeValueOnboardingState(
  userId: string,
  state: ValueOnboardingState,
): ValueOnboardingState {
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
  return state;
}

export function dismissValueOnboarding(
  userId: string,
  options?: { permanent?: boolean },
): ValueOnboardingState | null {
  if (!userId) return null;
  const prev = readValueOnboardingState(userId) ?? {};
  return writeValueOnboardingState(userId, {
    ...prev,
    dismissedAt: new Date().toISOString(),
    ...(options?.permanent ? { dismissPermanent: true } : {}),
  });
}

/** Marca el primer cara a cara (idempotente). */
export function markCompareVisited(userId: string): ValueOnboardingState | null {
  if (!userId) return null;
  const prev = readValueOnboardingState(userId) ?? {};
  if (prev.compareVisitedAt) return prev;
  return writeValueOnboardingState(userId, {
    ...prev,
    compareVisitedAt: new Date().toISOString(),
  });
}

export function shouldShowValueOnboarding(
  state: ValueOnboardingState | null,
  opts: {
    coreComplete: boolean;
    hasCollection: boolean;
    hasCompare: boolean;
  },
): boolean {
  if (!opts.coreComplete) return false;
  if (opts.hasCollection && opts.hasCompare) return false;
  if (state?.dismissPermanent) return false;
  if (state?.dismissedAt) {
    const dismissedAt = Date.parse(state.dismissedAt);
    if (
      Number.isFinite(dismissedAt) &&
      Date.now() - dismissedAt < VALUE_ONBOARDING_SOFT_DISMISS_MS
    ) {
      return false;
    }
  }
  return true;
}
