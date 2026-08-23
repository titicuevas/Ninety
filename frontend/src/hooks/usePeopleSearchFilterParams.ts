import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  parseDiscoverReasonParam,
  type DiscoverReasonFilter,
} from '@/lib/discoverProfiles';

const PEOPLE_QUERY_MAX = 80;

export type PeopleSearchFilterParams = {
  q: string;
  qDraft: string;
  setQDraft: (value: string) => void;
  reason: DiscoverReasonFilter | null;
  setReason: (next: DiscoverReasonFilter | null) => void;
  clearFilters: () => void;
};

/** `q` y `reason` sticky en `/search?tab=people`. */
export function usePeopleSearchFilterParams(): PeopleSearchFilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().slice(0, PEOPLE_QUERY_MAX);
  const reason = parseDiscoverReasonParam(searchParams.get('reason'));
  const [draftEntry, setDraftEntry] = useState<{ forQ: string; value: string } | null>(null);
  const qDraft = draftEntry?.forQ === q ? draftEntry.value : q;

  const setQDraft = (value: string) => {
    setDraftEntry({ forQ: q, value });
  };

  useEffect(() => {
    const next = qDraft.trim().slice(0, PEOPLE_QUERY_MAX);
    if (next === q) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      params.set('tab', 'people');
      if (next) params.set('q', next);
      else params.delete('q');
      setSearchParams(params, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [qDraft, q, searchParams, setSearchParams]);

  const setReason = (next: DiscoverReasonFilter | null) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'people');
    if (next) params.set('reason', next);
    else params.delete('reason');
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'people');
    params.delete('q');
    params.delete('reason');
    setDraftEntry(null);
    setSearchParams(params, { replace: true });
  };

  return { q, qDraft, setQDraft, reason, setReason, clearFilters };
}
