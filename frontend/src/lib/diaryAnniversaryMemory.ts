export type DiaryAnniversaryPrefs = {
  /** Preferencia en Ajustes; default true si no existe. */
  enabled?: boolean;
  dismissPermanent?: boolean;
  /** Día local (YYYY-MM-DD) en el que se hizo soft dismiss. */
  dismissedDayKey?: string;
  /** Último día local en el que se mostró la card (evitar re-spam el mismo día). */
  lastShownDayKey?: string;
};

const STORAGE_PREFIX = 'ninety.diaryAnniversary:v1:';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

/** Clave de día local YYYY-MM-DD. */
export function localDayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function readDiaryAnniversaryPrefs(userId: string): DiaryAnniversaryPrefs | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as DiaryAnniversaryPrefs;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function writeDiaryAnniversaryPrefs(
  userId: string,
  prefs: DiaryAnniversaryPrefs,
): DiaryAnniversaryPrefs {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  return prefs;
}

export function isDiaryAnniversaryEnabled(prefs: DiaryAnniversaryPrefs | null): boolean {
  return prefs?.enabled !== false;
}

export function setDiaryAnniversaryEnabled(
  userId: string,
  enabled: boolean,
): DiaryAnniversaryPrefs | null {
  if (!userId) return null;
  const prev = readDiaryAnniversaryPrefs(userId) ?? {};
  return writeDiaryAnniversaryPrefs(userId, { ...prev, enabled });
}

export function dismissDiaryAnniversary(
  userId: string,
  options?: { permanent?: boolean; now?: Date },
): DiaryAnniversaryPrefs | null {
  if (!userId) return null;
  const prev = readDiaryAnniversaryPrefs(userId) ?? {};
  const dayKey = localDayKey(options?.now ?? new Date());
  return writeDiaryAnniversaryPrefs(userId, {
    ...prev,
    dismissedDayKey: dayKey,
    ...(options?.permanent ? { dismissPermanent: true } : {}),
  });
}

export function markDiaryAnniversaryShown(
  userId: string,
  now: Date = new Date(),
): DiaryAnniversaryPrefs | null {
  if (!userId) return null;
  const prev = readDiaryAnniversaryPrefs(userId) ?? {};
  return writeDiaryAnniversaryPrefs(userId, {
    ...prev,
    lastShownDayKey: localDayKey(now),
  });
}

export function shouldShowDiaryAnniversary(
  prefs: DiaryAnniversaryPrefs | null,
  opts: {
    coreComplete: boolean;
    /** No competir con onboarding de valor. */
    valueOnboardingVisible: boolean;
    hasAnniversary: boolean;
    now?: Date;
  },
): boolean {
  if (!opts.coreComplete) return false;
  if (opts.valueOnboardingVisible) return false;
  if (!opts.hasAnniversary) return false;
  if (!isDiaryAnniversaryEnabled(prefs)) return false;
  if (prefs?.dismissPermanent) return false;

  const dayKey = localDayKey(opts.now ?? new Date());
  if (prefs?.dismissedDayKey === dayKey) return false;
  if (prefs?.lastShownDayKey === dayKey) return false;

  return true;
}
