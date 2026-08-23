import {
  parseRatingMin,
  parseTag,
  parseVisibility,
  parseWatchContext,
  parseYear,
  type DiaryVisibility,
} from '@/lib/diaryFilters';
import type { WatchContext } from '@/lib/watchContext';

export type DiaryFilterSnapshot = {
  q?: string;
  year?: number;
  rating?: number;
  context?: WatchContext;
  tag?: string;
  visibility?: Exclude<DiaryVisibility, 'all'>;
};

const STORAGE_PREFIX = 'ninety.diaryFilters:v1:';

const DIARY_FILTER_PARAM_KEYS = [
  'q',
  'year',
  'rating',
  'context',
  'tag',
  'visibility',
] as const;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function hasAnyDiaryFilterParam(params: URLSearchParams): boolean {
  return DIARY_FILTER_PARAM_KEYS.some((key) => params.has(key));
}

export function diaryFilterSnapshotHasValues(snapshot: DiaryFilterSnapshot | null): boolean {
  if (!snapshot) return false;
  return Boolean(
    (snapshot.q && snapshot.q.length >= 2) ||
      snapshot.year != null ||
      snapshot.rating != null ||
      snapshot.context ||
      snapshot.tag ||
      snapshot.visibility,
  );
}

export function readDiaryFilterMemory(userId: string): DiaryFilterSnapshot | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(storageKey(userId));
      return null;
    }
    return normalizeDiaryFilterSnapshot(parsed as Record<string, unknown>);
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function normalizeDiaryFilterSnapshot(
  raw: Record<string, unknown>,
): DiaryFilterSnapshot | null {
  const qRaw = typeof raw.q === 'string' ? raw.q.trim() : '';
  const q = qRaw.length >= 2 ? qRaw : undefined;
  const year = parseYear(raw.year != null ? String(raw.year) : null);
  const rating = parseRatingMin(raw.rating != null ? String(raw.rating) : null);
  const context = parseWatchContext(typeof raw.context === 'string' ? raw.context : null);
  const tag = parseTag(typeof raw.tag === 'string' ? raw.tag : null);
  const visibilityRaw = parseVisibility(
    typeof raw.visibility === 'string' ? raw.visibility : null,
  );
  const visibility = visibilityRaw === 'all' ? undefined : visibilityRaw;

  const snapshot: DiaryFilterSnapshot = {
    ...(q ? { q } : {}),
    ...(year != null ? { year } : {}),
    ...(rating != null ? { rating } : {}),
    ...(context ? { context } : {}),
    ...(tag ? { tag } : {}),
    ...(visibility ? { visibility } : {}),
  };

  return diaryFilterSnapshotHasValues(snapshot) ? snapshot : null;
}

export function writeDiaryFilterMemory(
  userId: string,
  snapshot: DiaryFilterSnapshot,
): DiaryFilterSnapshot | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  const normalized = normalizeDiaryFilterSnapshot(snapshot as Record<string, unknown>);
  if (!normalized) {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
  localStorage.setItem(storageKey(userId), JSON.stringify(normalized));
  return normalized;
}

export function clearDiaryFilterMemory(userId: string): void {
  if (!userId || typeof localStorage === 'undefined') return;
  localStorage.removeItem(storageKey(userId));
}

/** Serializa el estado actual de la URL del diario (Mis Capsules). */
export function diaryFilterSnapshotFromSearchParams(
  params: URLSearchParams,
  withVisibility: boolean,
): DiaryFilterSnapshot {
  const qRaw = (params.get('q') ?? '').trim();
  const q = qRaw.length >= 2 ? qRaw : undefined;
  const year = parseYear(params.get('year'));
  const rating = parseRatingMin(params.get('rating'));
  const context = parseWatchContext(params.get('context'));
  const tag = parseTag(params.get('tag'));
  const visibility = withVisibility ? parseVisibility(params.get('visibility')) : 'all';

  return {
    ...(q ? { q } : {}),
    ...(year != null ? { year } : {}),
    ...(rating != null ? { rating } : {}),
    ...(context ? { context } : {}),
    ...(tag ? { tag } : {}),
    ...(visibility !== 'all' ? { visibility } : {}),
  };
}

export function diaryFilterSnapshotToSearchParams(
  snapshot: DiaryFilterSnapshot,
  withVisibility: boolean,
): URLSearchParams {
  const next = new URLSearchParams();
  if (snapshot.q && snapshot.q.length >= 2) next.set('q', snapshot.q);
  if (snapshot.year != null) next.set('year', String(snapshot.year));
  if (snapshot.rating != null) next.set('rating', String(snapshot.rating));
  if (snapshot.context) next.set('context', snapshot.context);
  if (snapshot.tag) next.set('tag', snapshot.tag);
  if (withVisibility && snapshot.visibility) next.set('visibility', snapshot.visibility);
  return next;
}
