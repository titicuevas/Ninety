export type WantToGoNudgePrefs = {
  /** Preferencia en Ajustes; default true. */
  enabled?: boolean;
  dismissPermanent?: boolean;
  dismissedAt?: string;
  /** Partidos ya saltados (Ahora no / tras abrir lista). */
  skippedMatchIds?: number[];
};

const STORAGE_PREFIX = 'ninety.wantToGoNudge:v1:';

/** Soft dismiss: 3 días. */
export const WANT_TO_GO_NUDGE_SOFT_DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readWantToGoNudgePrefs(userId: string): WantToGoNudgePrefs | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as WantToGoNudgePrefs;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function writeWantToGoNudgePrefs(
  userId: string,
  prefs: WantToGoNudgePrefs,
): WantToGoNudgePrefs {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  return prefs;
}

export function isWantToGoNudgeEnabled(prefs: WantToGoNudgePrefs | null): boolean {
  return prefs?.enabled !== false;
}

export function setWantToGoNudgeEnabled(
  userId: string,
  enabled: boolean,
): WantToGoNudgePrefs | null {
  if (!userId) return null;
  const prev = readWantToGoNudgePrefs(userId) ?? {};
  return writeWantToGoNudgePrefs(userId, { ...prev, enabled });
}

export function getSkippedWantToGoMatchIds(prefs: WantToGoNudgePrefs | null): number[] {
  if (!prefs?.skippedMatchIds?.length) return [];
  return prefs.skippedMatchIds.filter((id) => typeof id === 'number' && Number.isFinite(id));
}

export function skipWantToGoNudgeMatch(
  userId: string,
  matchId: number,
): WantToGoNudgePrefs | null {
  if (!userId || !Number.isFinite(matchId)) return null;
  const prev = readWantToGoNudgePrefs(userId) ?? {};
  const skipped = new Set([...getSkippedWantToGoMatchIds(prev), matchId]);
  return writeWantToGoNudgePrefs(userId, {
    ...prev,
    skippedMatchIds: [...skipped].slice(-40),
  });
}

export function dismissWantToGoNudge(
  userId: string,
  options?: { permanent?: boolean; matchId?: number },
): WantToGoNudgePrefs | null {
  if (!userId) return null;
  const prev = readWantToGoNudgePrefs(userId) ?? {};
  const next: WantToGoNudgePrefs = {
    ...prev,
    dismissedAt: new Date().toISOString(),
    ...(options?.permanent ? { dismissPermanent: true } : {}),
  };
  if (options?.matchId != null && Number.isFinite(options.matchId)) {
    const skipped = new Set([...getSkippedWantToGoMatchIds(prev), options.matchId]);
    next.skippedMatchIds = [...skipped].slice(-40);
  }
  return writeWantToGoNudgePrefs(userId, next);
}

export function shouldShowWantToGoNudge(
  prefs: WantToGoNudgePrefs | null,
  opts: {
    coreComplete: boolean;
    valueOnboardingVisible: boolean;
    anniversaryVisible?: boolean;
    milestoneVisible?: boolean;
    /** Soft nudge «completa tu Capsule» tiene prioridad. */
    incompleteCapsuleVisible?: boolean;
    hasCandidate: boolean;
    nowMs?: number;
  },
): boolean {
  if (!opts.coreComplete) return false;
  if (opts.valueOnboardingVisible) return false;
  if (opts.anniversaryVisible) return false;
  if (opts.milestoneVisible) return false;
  if (opts.incompleteCapsuleVisible) return false;
  if (!opts.hasCandidate) return false;
  if (!isWantToGoNudgeEnabled(prefs)) return false;
  if (prefs?.dismissPermanent) return false;

  const now = opts.nowMs ?? Date.now();
  if (prefs?.dismissedAt) {
    const dismissedAt = Date.parse(prefs.dismissedAt);
    if (
      Number.isFinite(dismissedAt) &&
      now - dismissedAt < WANT_TO_GO_NUDGE_SOFT_DISMISS_MS
    ) {
      return false;
    }
  }

  return true;
}
