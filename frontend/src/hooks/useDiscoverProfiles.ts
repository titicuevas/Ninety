import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/profile';

export interface DiscoverProfilesResponse {
  profiles: Profile[];
}

export function useDiscoverProfiles(enabled = true) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['profile', 'discover'],
    queryFn: () =>
      apiFetch<DiscoverProfilesResponse>('/api/profile/discover?limit=6', {}, session?.access_token),
    enabled: enabled && !!session?.access_token,
    staleTime: 2 * 60_000,
  });
}
