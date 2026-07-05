import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { CuratedCompetition } from '@/types/football';
import { MIN_QUERY_LENGTH } from '@/hooks/useMatchSearch';

export interface TeamCompetitionsResponse {
  team: { id: number; name: string } | null;
  competitions: CuratedCompetition[];
  filtered: boolean;
}

export function useTeamCompetitions(query: string) {
  const session = useAuthStore((s) => s.session);
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['football', 'teams', 'competitions', trimmed],
    queryFn: () =>
      apiFetch<TeamCompetitionsResponse>(
        `/api/football/teams/competitions?q=${encodeURIComponent(trimmed)}`,
        {},
        session?.access_token,
      ),
    enabled: !!session && trimmed.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
