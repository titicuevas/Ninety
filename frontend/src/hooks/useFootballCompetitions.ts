import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { CuratedCompetitionsResponse } from '@/types/football';

export function useFootballCompetitions() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['football', 'competitions', 'curated'],
    queryFn: () =>
      apiFetch<CuratedCompetitionsResponse>('/api/football/competitions/curated', {}, session?.access_token),
    enabled: !!session,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
