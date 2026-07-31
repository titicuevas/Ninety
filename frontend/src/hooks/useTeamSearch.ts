import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { MIN_QUERY_LENGTH } from '@/hooks/useMatchSearch';

export type TeamSearchItem = {
  id?: number;
  name: string;
  shortName?: string;
  score?: number;
};

export type TeamSearchResponse = {
  teams: TeamSearchItem[];
};

export function useTeamSearch(query: string) {
  const session = useAuthStore((s) => s.session);
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['football', 'teams', 'search', trimmed],
    queryFn: () =>
      apiFetch<TeamSearchResponse>(
        `/api/football/teams?q=${encodeURIComponent(trimmed)}`,
        {},
        session?.access_token,
      ),
    enabled: !!session && trimmed.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
