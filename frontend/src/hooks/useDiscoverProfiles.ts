import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { DiscoverReasonFilter } from '@/lib/discoverProfiles';
import type { Profile } from '@/types/profile';

export interface DiscoverProfilesResponse {
  profiles: Profile[];
}

export function useDiscoverProfiles(
  enabled = true,
  opts?: { limit?: number; reason?: DiscoverReasonFilter | null },
) {
  const session = useAuthStore((s) => s.session);
  const limit = opts?.limit ?? 6;
  const reason = opts?.reason ?? null;

  return useQuery({
    queryKey: ['profile', 'discover', { limit, reason: reason ?? 'all' }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (reason) params.set('reason', reason);
      return apiFetch<DiscoverProfilesResponse>(
        `/api/profile/discover?${params.toString()}`,
        {},
        session?.access_token,
      );
    },
    enabled: enabled && !!session?.access_token,
    staleTime: 2 * 60_000,
  });
}
