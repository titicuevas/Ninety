export type DiaryMilestonePrefs = {
  /** Preferencia en Ajustes; default true si no existe. */
  enabled?: boolean;
  dismissPermanent?: boolean;
  /** Soft dismiss: ISO timestamp. */
  dismissedAt?: string;
  /** Umbrales ya celebrados (o salteados al celebrar uno mayor). */
  celebrated?: number[];
};

const STORAGE_PREFIX = 'ninety.diaryMilestone:v1:';

/** Soft dismiss: 3 días (mismo ritmo que digest). */
const MILESTONE_SOFT_DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readDiaryMilestonePrefs(userId: string): DiaryMilestonePrefs | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as DiaryMilestonePrefs;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function writeDiaryMilestonePrefs(
  userId: string,
  prefs: DiaryMilestonePrefs,
): DiaryMilestonePrefs {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  return prefs;
}

export function isDiaryMilestoneEnabled(prefs: DiaryMilestonePrefs | null): boolean {
  return prefs?.enabled !== false;
}

export function setDiaryMilestoneEnabled(
  userId: string,
  enabled: boolean,
): DiaryMilestonePrefs | null {
  if (!userId) return null;
  const prev = readDiaryMilestonePrefs(userId) ?? {};
  return writeDiaryMilestonePrefs(userId, { ...prev, enabled });
}

export function getCelebratedMilestones(prefs: DiaryMilestonePrefs | null): number[] {
  if (!prefs?.celebrated?.length) return [];
  return prefs.celebrated.filter((n) => Number.isFinite(n) && n > 0);
}

export function celebrateDiaryMilestone(
  userId: string,
  thresholds: readonly number[],
): DiaryMilestonePrefs | null {
  if (!userId) return null;
  const prev = readDiaryMilestonePrefs(userId) ?? {};
  const merged = new Set([...getCelebratedMilestones(prev), ...thresholds]);
  return writeDiaryMilestonePrefs(userId, {
    ...prev,
    celebrated: [...merged].sort((a, b) => a - b),
    dismissedAt: undefined,
  });
}

export function dismissDiaryMilestone(
  userId: string,
  options?: { permanent?: boolean },
): DiaryMilestonePrefs | null {
  if (!userId) return null;
  const prev = readDiaryMilestonePrefs(userId) ?? {};
  return writeDiaryMilestonePrefs(userId, {
    ...prev,
    dismissedAt: new Date().toISOString(),
    ...(options?.permanent ? { dismissPermanent: true } : {}),
  });
}

export function shouldShowDiaryMilestone(
  prefs: DiaryMilestonePrefs | null,
  opts: {
    coreComplete: boolean;
    /** No competir con onboarding de valor. */
    valueOnboardingVisible: boolean;
    /** Aniversario «Tal día como hoy» tiene prioridad (solo ese día). */
    anniversaryVisible?: boolean;
    hasMilestone: boolean;
    nowMs?: number;
  },
): boolean {
  if (!opts.coreComplete) return false;
  if (opts.valueOnboardingVisible) return false;
  if (opts.anniversaryVisible) return false;
  if (!opts.hasMilestone) return false;
  if (!isDiaryMilestoneEnabled(prefs)) return false;
  if (prefs?.dismissPermanent) return false;

  const now = opts.nowMs ?? Date.now();
  if (prefs?.dismissedAt) {
    const dismissedAt = Date.parse(prefs.dismissedAt);
    if (Number.isFinite(dismissedAt) && now - dismissedAt < MILESTONE_SOFT_DISMISS_MS) {
      return false;
    }
  }

  return true;
}
