import { useDeferredValue, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  parseRatingMin,
  parseVisibility,
  parseWatchContext,
  parseYear,
  type DiaryVisibility,
} from '@/lib/diaryFilters';
import type { WatchContext } from '@/lib/watchContext';

type UseDiaryFilterParamsOptions = {
  /** Incluye filtro de visibilidad (solo diario propio). */
  withVisibility?: boolean;
};

export type DiaryFilterParams = {
  q: string;
  qDraft: string;
  setQDraft: (value: string) => void;
  year: number | undefined;
  ratingMin: number | undefined;
  watchContext: WatchContext | undefined;
  visibility: DiaryVisibility;
  hasFilters: boolean;
  patchParams: (patch: Record<string, string | null>) => void;
  clearFilters: () => void;
};

export function useDiaryFilterParams(
  options: UseDiaryFilterParamsOptions = {},
): DiaryFilterParams {
  const { withVisibility = false } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const [qDraft, setQDraft] = useState(() => searchParams.get('q') ?? '');
  const deferredQ = useDeferredValue(qDraft.trim());

  const year = parseYear(searchParams.get('year'));
  const ratingMin = parseRatingMin(searchParams.get('rating'));
  const watchContext = parseWatchContext(searchParams.get('context'));
  const visibility = withVisibility
    ? parseVisibility(searchParams.get('visibility'))
    : ('all' as const);
  const q = deferredQ.length >= 2 ? deferredQ : '';

  const hasFilters =
    q.length >= 2 ||
    year != null ||
    ratingMin != null ||
    watchContext != null ||
    (withVisibility && visibility !== 'all');

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setQDraft('');
    setSearchParams({}, { replace: true });
  };

  return {
    q,
    qDraft,
    setQDraft,
    year,
    ratingMin,
    watchContext,
    visibility,
    hasFilters,
    patchParams,
    clearFilters,
  };
}
