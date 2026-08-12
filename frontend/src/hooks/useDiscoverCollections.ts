import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { DiscoverCollectionsResponse } from '@/types/collection';

export function useDiscoverCollections(enabled = true) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['collections', 'discover'],
    queryFn: () =>
      apiFetch<DiscoverCollectionsResponse>(
        '/api/collections/discover?limit=24',
        {},
        session?.access_token,
      ),
    enabled: !!session && enabled,
  });
}
