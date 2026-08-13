export type IncompleteCapsulePrefs = {
  /** Preferencia en Ajustes; default true. */
  enabled?: boolean;
  dismissPermanent?: boolean;
  dismissedAt?: string;
  /** Capsules ya saltadas (Ahora no / tras abrir editar). */
  skippedIds?: string[];
};

const STORAGE_PREFIX = 'ninety.incompleteCapsule:v1:';

/** Soft dismiss: 3 días. */
export const INCOMPLETE_CAPSULE_SOFT_DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readIncompleteCapsulePrefs(userId: string): IncompleteCapsulePrefs | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as IncompleteCapsulePrefs;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function writeIncompleteCapsulePrefs(
  userId: string,
  prefs: IncompleteCapsulePrefs,
): IncompleteCapsulePrefs {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  return prefs;
}

export function isIncompleteCapsuleNudgeEnabled(prefs: IncompleteCapsulePrefs | null): boolean {
  return prefs?.enabled !== false;
}

export function getSkippedIncompleteCapsuleIds(prefs: IncompleteCapsulePrefs | null): string[] {
  if (!prefs?.skippedIds?.length) return [];
  return prefs.skippedIds.filter((id) => typeof id === 'string' && id.length > 0);
}

export function skipIncompleteCapsule(
  userId: string,
  capsuleId: string,
): IncompleteCapsulePrefs | null {
  if (!userId || !capsuleId) return null;
  const prev = readIncompleteCapsulePrefs(userId) ?? {};
  const skipped = new Set([...getSkippedIncompleteCapsuleIds(prev), capsuleId]);
  return writeIncompleteCapsulePrefs(userId, {
    ...prev,
    skippedIds: [...skipped].slice(-40),
  });
}

export function dismissIncompleteCapsuleNudge(
  userId: string,
  options?: { permanent?: boolean; capsuleId?: string },
): IncompleteCapsulePrefs | null {
  if (!userId) return null;
  const prev = readIncompleteCapsulePrefs(userId) ?? {};
  const next: IncompleteCapsulePrefs = {
    ...prev,
    dismissedAt: new Date().toISOString(),
    ...(options?.permanent ? { dismissPermanent: true } : {}),
  };
  if (options?.capsuleId) {
    const skipped = new Set([...getSkippedIncompleteCapsuleIds(prev), options.capsuleId]);
    next.skippedIds = [...skipped].slice(-40);
  }
  return writeIncompleteCapsulePrefs(userId, next);
}

export function shouldShowIncompleteCapsuleNudge(
  prefs: IncompleteCapsulePrefs | null,
  opts: {
    coreComplete: boolean;
    valueOnboardingVisible: boolean;
    anniversaryVisible?: boolean;
    milestoneVisible?: boolean;
    hasCandidate: boolean;
    nowMs?: number;
  },
): boolean {
  if (!opts.coreComplete) return false;
  if (opts.valueOnboardingVisible) return false;
  if (opts.anniversaryVisible) return false;
  if (opts.milestoneVisible) return false;
  if (!opts.hasCandidate) return false;
  if (!isIncompleteCapsuleNudgeEnabled(prefs)) return false;
  if (prefs?.dismissPermanent) return false;

  const now = opts.nowMs ?? Date.now();
  if (prefs?.dismissedAt) {
    const dismissedAt = Date.parse(prefs.dismissedAt);
    if (
      Number.isFinite(dismissedAt) &&
      now - dismissedAt < INCOMPLETE_CAPSULE_SOFT_DISMISS_MS
    ) {
      return false;
    }
  }

  return true;
}
