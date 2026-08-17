import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { FollowActivityResponse } from '@/types/activity';

const BADGE_QUERY_KEY = ['activity', 'follows', 'badge'] as const;

/** Total de eventos de follows para badges en atajos Actividad (Home/Feed). */
export function useFollowActivityBadge() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: BADGE_QUERY_KEY,
    queryFn: () =>
      apiFetch<FollowActivityResponse>(
        '/api/activity?limit=1&offset=0',
        {},
        session?.access_token,
      ),
    enabled: !!session,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useFollowActivityBadgeCount(): number {
  const { data } = useFollowActivityBadge();
  if ((data?.following_count ?? 0) === 0) return 0;
  return data?.total ?? 0;
}
