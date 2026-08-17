import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  parseDiscoverCollectionsQueryParam,
  parseDiscoverCollectionsSortParam,
  type DiscoverCollectionsSort,
} from '@/lib/discoverCollectionsParams';

export type DiscoverCollectionsFilterParams = {
  q: string;
  qDraft: string;
  setQDraft: (value: string) => void;
  sort: DiscoverCollectionsSort;
  setSort: (next: DiscoverCollectionsSort) => void;
  clearFilters: () => void;
};

/** `q` y `sort` sticky en `/collections/explore`. */
export function useDiscoverCollectionsFilterParams(): DiscoverCollectionsFilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = parseDiscoverCollectionsQueryParam(searchParams.get('q'));
  const sort = parseDiscoverCollectionsSortParam(searchParams.get('sort'));
  const [draftEntry, setDraftEntry] = useState<{ forQ: string; value: string } | null>(null);
  const qDraft = draftEntry?.forQ === q ? draftEntry.value : q;

  const setQDraft = (value: string) => {
    setDraftEntry({ forQ: q, value });
  };

  useEffect(() => {
    const next = qDraft.trim().slice(0, 80);
    if (next === q) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (next) params.set('q', next);
      else params.delete('q');
      setSearchParams(params, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [qDraft, q, searchParams, setSearchParams]);

  const setSort = (next: DiscoverCollectionsSort) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'relevant') params.delete('sort');
    else params.set('sort', next);
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    params.delete('sort');
    setDraftEntry(null);
    setSearchParams(params, { replace: true });
  };

  return { q, qDraft, setQDraft, sort, setSort, clearFilters };
}
