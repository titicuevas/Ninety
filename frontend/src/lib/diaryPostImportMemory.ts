/**
 * Guía post-import on-device: tras restaurar el diario desde JSON,
 * orientar a colecciones / feed / comparar (las colecciones no van en el export).
 */

export type DiaryPostImportState = {
  /** ISO timestamp del último import exitoso con Capsules nuevas. */
  importedAt?: string;
  importedCount?: number;
  dismissedAt?: string;
  dismissPermanent?: boolean;
};

const STORAGE_PREFIX = 'ninety.diaryPostImport:v1:';

/** Soft dismiss: no volver a mostrar durante 14 días. */
export const POST_IMPORT_SOFT_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readDiaryPostImportState(userId: string): DiaryPostImportState | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as DiaryPostImportState;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function writeDiaryPostImportState(
  userId: string,
  state: DiaryPostImportState,
): DiaryPostImportState {
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
  return state;
}

/** Marca un import exitoso (reinicia dismisses soft; conserva permanente). */
export function markDiaryImported(
  userId: string,
  opts: { importedCount: number; at?: Date } = { importedCount: 0 },
): DiaryPostImportState | null {
  if (!userId) return null;
  if (opts.importedCount <= 0) {
    return readDiaryPostImportState(userId);
  }
  const prev = readDiaryPostImportState(userId) ?? {};
  if (prev.dismissPermanent) {
    return writeDiaryPostImportState(userId, {
      ...prev,
      importedAt: (opts.at ?? new Date()).toISOString(),
      importedCount: opts.importedCount,
    });
  }
  return writeDiaryPostImportState(userId, {
    importedAt: (opts.at ?? new Date()).toISOString(),
    importedCount: opts.importedCount,
  });
}

export function dismissDiaryPostImport(
  userId: string,
  options?: { permanent?: boolean },
): DiaryPostImportState | null {
  if (!userId) return null;
  const prev = readDiaryPostImportState(userId) ?? {};
  return writeDiaryPostImportState(userId, {
    ...prev,
    dismissedAt: new Date().toISOString(),
    ...(options?.permanent ? { dismissPermanent: true } : {}),
  });
}

export function shouldShowDiaryPostImportGuide(
  state: DiaryPostImportState | null,
  opts: {
    coreComplete: boolean;
    nowMs?: number;
  },
): boolean {
  if (!opts.coreComplete) return false;
  if (!state?.importedAt) return false;
  if ((state.importedCount ?? 0) <= 0) return false;
  if (state.dismissPermanent) return false;

  const now = opts.nowMs ?? Date.now();
  if (state.dismissedAt) {
    const dismissedAt = Date.parse(state.dismissedAt);
    if (
      Number.isFinite(dismissedAt) &&
      now - dismissedAt < POST_IMPORT_SOFT_DISMISS_MS
    ) {
      return false;
    }
  }
  return true;
}

function isFreshPostImport(state: DiaryPostImportState | null): boolean {
  if (!state?.importedAt || (state.importedCount ?? 0) <= 0) return false;
  if (state.dismissPermanent) return false;
  if (state.dismissedAt) {
    const dismissedAt = Date.parse(state.dismissedAt);
    if (
      Number.isFinite(dismissedAt) &&
      Date.now() - dismissedAt < POST_IMPORT_SOFT_DISMISS_MS
    ) {
      return false;
    }
  }
  return true;
}

/** Copy contextual para empty state de colecciones. */
export function postImportCollectionsHint(state: DiaryPostImportState | null): string | null {
  if (!isFreshPostImport(state)) return null;
  const n = state!.importedCount ?? 0;
  return n === 1
    ? 'Acabas de restaurar 1 Capsule. Las colecciones no se importan: crea una para agrupar partidos.'
    : `Acabas de restaurar ${n} Capsules. Las colecciones no se importan: crea una para agrupar partidos.`;
}

/** Copy contextual para empty state del feed. */
export function postImportFeedHint(state: DiaryPostImportState | null): string | null {
  if (!isFreshPostImport(state)) return null;
  return 'Tu diario ya está restaurado. Sigue aficionados o explora la comunidad para llenar el feed.';
}
