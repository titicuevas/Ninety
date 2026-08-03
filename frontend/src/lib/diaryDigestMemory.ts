export type DiaryDigestPrefs = {
  /** Preferencia en Ajustes; default true si no existe. */
  enabled?: boolean;
  dismissedAt?: string;
  dismissPermanent?: boolean;
  /** Última vez que se mostró un digest `weekly` (evitar spam semanal). */
  lastWeeklyShownAt?: string;
};

const STORAGE_PREFIX = 'ninety.diaryDigest:v1:';

/** Soft dismiss (nudge/gap): 3 días. */
export const DIGEST_SOFT_DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
/** No repetir el resumen semanal antes de 7 días. */
export const DIGEST_WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readDiaryDigestPrefs(userId: string): DiaryDigestPrefs | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as DiaryDigestPrefs;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function writeDiaryDigestPrefs(userId: string, prefs: DiaryDigestPrefs): DiaryDigestPrefs {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  return prefs;
}

export function isDiaryDigestEnabled(prefs: DiaryDigestPrefs | null): boolean {
  return prefs?.enabled !== false;
}

export function setDiaryDigestEnabled(userId: string, enabled: boolean): DiaryDigestPrefs | null {
  if (!userId) return null;
  const prev = readDiaryDigestPrefs(userId) ?? {};
  return writeDiaryDigestPrefs(userId, { ...prev, enabled });
}

export function dismissDiaryDigest(
  userId: string,
  options?: { permanent?: boolean },
): DiaryDigestPrefs | null {
  if (!userId) return null;
  const prev = readDiaryDigestPrefs(userId) ?? {};
  return writeDiaryDigestPrefs(userId, {
    ...prev,
    dismissedAt: new Date().toISOString(),
    ...(options?.permanent ? { dismissPermanent: true } : {}),
  });
}

export function markWeeklyDigestShown(userId: string, at: Date = new Date()): DiaryDigestPrefs | null {
  if (!userId) return null;
  const prev = readDiaryDigestPrefs(userId) ?? {};
  return writeDiaryDigestPrefs(userId, {
    ...prev,
    lastWeeklyShownAt: at.toISOString(),
  });
}

export function shouldShowDiaryDigest(
  prefs: DiaryDigestPrefs | null,
  opts: {
    coreComplete: boolean;
    /** Si el onboarding de valor está visible, no competir. */
    valueOnboardingVisible: boolean;
    /** Aniversario «Tal día como hoy» tiene prioridad sobre el digest. */
    anniversaryVisible?: boolean;
    /** Hito del diario tiene prioridad sobre el digest. */
    milestoneVisible?: boolean;
    hasDigest: boolean;
    kind: 'weekly' | 'nudge' | 'gap' | null;
    nowMs?: number;
  },
): boolean {
  if (!opts.coreComplete) return false;
  if (opts.valueOnboardingVisible) return false;
  if (opts.anniversaryVisible) return false;
  if (opts.milestoneVisible) return false;
  if (!opts.hasDigest || !opts.kind) return false;
  if (!isDiaryDigestEnabled(prefs)) return false;
  if (prefs?.dismissPermanent) return false;

  const now = opts.nowMs ?? Date.now();

  if (prefs?.dismissedAt) {
    const dismissedAt = Date.parse(prefs.dismissedAt);
    if (Number.isFinite(dismissedAt) && now - dismissedAt < DIGEST_SOFT_DISMISS_MS) {
      return false;
    }
  }

  if (opts.kind === 'weekly' && prefs?.lastWeeklyShownAt) {
    const shown = Date.parse(prefs.lastWeeklyShownAt);
    if (Number.isFinite(shown) && now - shown < DIGEST_WEEKLY_COOLDOWN_MS) {
      return false;
    }
  }

  return true;
}
