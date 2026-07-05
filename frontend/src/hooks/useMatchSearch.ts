import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { MatchSearchResponse } from '@/types/football';

const MIN_QUERY_LENGTH = 2;

export interface MatchSearchFilters {
  competition?: string;
  season?: number;
}

export function useMatchSearch(query: string, filters: MatchSearchFilters = {}) {
  const session = useAuthStore((s) => s.session);
  const trimmed = query.trim();
  const { competition, season } = filters;
  const canSearch = !!competition || trimmed.length >= MIN_QUERY_LENGTH;

  const params = new URLSearchParams();
  if (trimmed) params.set('q', trimmed);
  if (competition) params.set('competition', competition);
  if (season) params.set('season', String(season));

  return useQuery({
    queryKey: ['football', 'matches', 'search', trimmed, competition ?? '', season ?? ''],
    queryFn: () =>
      apiFetch<MatchSearchResponse>(`/api/football/matches/search?${params.toString()}`, {}, session?.access_token),
    enabled: !!session && canSearch,
    staleTime: 60_000,
  });
}

export { MIN_QUERY_LENGTH };
