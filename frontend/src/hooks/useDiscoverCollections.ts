import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { DiscoverCollectionsSort } from '@/lib/discoverCollectionsParams';
import { useAuthStore } from '@/stores/authStore';
import type { DiscoverCollectionsResponse } from '@/types/collection';

type UseDiscoverCollectionsOptions = {
  enabled?: boolean;
  q?: string;
  sort?: DiscoverCollectionsSort;
  limit?: number;
};

export function useDiscoverCollections(
  enabledOrOptions: boolean | UseDiscoverCollectionsOptions = true,
) {
  const session = useAuthStore((s) => s.session);
  const options =
    typeof enabledOrOptions === 'boolean'
      ? { enabled: enabledOrOptions }
      : enabledOrOptions;
  const enabled = options.enabled ?? true;
  const q = options.q?.trim() ?? '';
  const sort = options.sort ?? 'relevant';
  const limit = options.limit ?? 24;

  return useQuery({
    queryKey: ['collections', 'discover', { q, sort, limit }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (q) params.set('q', q);
      if (sort !== 'relevant') params.set('sort', sort);
      return apiFetch<DiscoverCollectionsResponse>(
        `/api/collections/discover?${params.toString()}`,
        {},
        session?.access_token,
      );
    },
    enabled: !!session && enabled,
  });
}
