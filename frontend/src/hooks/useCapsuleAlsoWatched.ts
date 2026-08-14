import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { AlsoWatchedPerson } from '@/lib/capsuleAlsoWatched';
import { useAuthStore } from '@/stores/authStore';

export function useCapsuleAlsoWatched(matchId: number | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', 'also-watched', matchId],
    queryFn: () =>
      apiFetch<{ people: AlsoWatchedPerson[]; total: number }>(
        `/api/capsules/me/${matchId}/following`,
        {},
        session?.access_token,
      ),
    enabled: !!session && matchId != null && Number.isFinite(matchId) && matchId !== 0,
  });
}
