import { useDeferredValue, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  parseRatingMin,
  parseTag,
  parseVisibility,
  parseWatchContext,
  parseYear,
  type DiaryVisibility,
} from '@/lib/diaryFilters';
import {
  clearDiaryFilterMemory,
  diaryFilterSnapshotFromSearchParams,
  diaryFilterSnapshotHasValues,
  diaryFilterSnapshotToSearchParams,
  hasAnyDiaryFilterParam,
  readDiaryFilterMemory,
  writeDiaryFilterMemory,
} from '@/lib/diaryFilterMemory';
import type { WatchContext } from '@/lib/watchContext';
import { useAuthStore } from '@/stores/authStore';

type UseDiaryFilterParamsOptions = {
  /** Incluye filtro de visibilidad (solo diario propio). */
  withVisibility?: boolean;
  /**
   * Recuerda el último filtro en localStorage (Mis Capsules).
   * Si la URL llega vacía, restaura el snapshot guardado.
   */
  persist?: boolean;
};

export type DiaryFilterParams = {
  q: string;
  qDraft: string;
  setQDraft: (value: string) => void;
  year: number | undefined;
  ratingMin: number | undefined;
  watchContext: WatchContext | undefined;
  tag: string | undefined;
  visibility: DiaryVisibility;
  hasFilters: boolean;
  patchParams: (patch: Record<string, string | null>) => void;
  clearFilters: () => void;
};

export function useDiaryFilterParams(
  options: UseDiaryFilterParamsOptions = {},
): DiaryFilterParams {
  const { withVisibility = false, persist = false } = options;
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [qDraft, setQDraft] = useState(() => searchParams.get('q') ?? '');
  const deferredQ = useDeferredValue(qDraft.trim());
  const hydratedRef = useRef(false);

  useLayoutEffect(() => {
    if (!persist || !userId || hydratedRef.current) return;
    hydratedRef.current = true;

    if (hasAnyDiaryFilterParam(searchParams)) {
      const fromUrl = diaryFilterSnapshotFromSearchParams(searchParams, withVisibility);
      if (diaryFilterSnapshotHasValues(fromUrl)) writeDiaryFilterMemory(userId, fromUrl);
      return;
    }

    const saved = readDiaryFilterMemory(userId);
    if (!diaryFilterSnapshotHasValues(saved)) return;

    const next = diaryFilterSnapshotToSearchParams(saved!, withVisibility);
    if (saved!.q) setQDraft(saved!.q);
    setSearchParams(next, { replace: true });
  }, [persist, userId, searchParams, setSearchParams, withVisibility]);

  const year = parseYear(searchParams.get('year'));
  const ratingMin = parseRatingMin(searchParams.get('rating'));
  const watchContext = parseWatchContext(searchParams.get('context'));
  const tag = parseTag(searchParams.get('tag'));
  const visibility = withVisibility
    ? parseVisibility(searchParams.get('visibility'))
    : ('all' as const);
  const q = deferredQ.length >= 2 ? deferredQ : '';

  const hasFilters =
    q.length >= 2 ||
    year != null ||
    ratingMin != null ||
    watchContext != null ||
    tag != null ||
    (withVisibility && visibility !== 'all');

  const persistFromParams = (params: URLSearchParams) => {
    if (!persist || !userId) return;
    const snapshot = diaryFilterSnapshotFromSearchParams(params, withVisibility);
    if (diaryFilterSnapshotHasValues(snapshot)) {
      writeDiaryFilterMemory(userId, snapshot);
    } else {
      clearDiaryFilterMemory(userId);
    }
  };

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
    persistFromParams(next);
  };

  const clearFilters = () => {
    setQDraft('');
    setSearchParams({}, { replace: true });
    if (persist && userId) clearDiaryFilterMemory(userId);
  };

  return {
    q,
    qDraft,
    setQDraft,
    year,
    ratingMin,
    watchContext,
    tag,
    visibility,
    hasFilters,
    patchParams,
    clearFilters,
  };
}
