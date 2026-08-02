import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { MatchSearchResponse } from '@/types/football';

const MIN_QUERY_LENGTH = 2;

export interface MatchSearchFilters {
  competition?: string;
  season?: number;
  /** Mes civil 1–12; el backend lo traduce a dateFrom/dateTo según la temporada. */
  month?: number;
}

export function useMatchSearch(query: string, filters: MatchSearchFilters = {}) {
  const session = useAuthStore((s) => s.session);
  const trimmed = query.trim();
  const { competition, season, month } = filters;
  const canSearch = !!competition || trimmed.length >= MIN_QUERY_LENGTH;

  const params = new URLSearchParams();
  if (trimmed) params.set('q', trimmed);
  if (competition) params.set('competition', competition);
  if (season) params.set('season', String(season));
  if (month) params.set('month', String(month));

  return useQuery({
    queryKey: ['football', 'matches', 'search', trimmed, competition ?? '', season ?? '', month ?? ''],
    queryFn: () =>
      apiFetch<MatchSearchResponse>(`/api/football/matches/search?${params.toString()}`, {}, session?.access_token),
    enabled: !!session && canSearch,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });
}

export { MIN_QUERY_LENGTH };
