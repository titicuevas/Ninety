import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ActivityListFilter } from '@/lib/activityTypeFilter';
import { useAuthStore } from '@/stores/authStore';
import type { FollowActivityResponse } from '@/types/activity';

const ACTIVITY_PAGE_SIZE = 20;

export function useFollowActivity(type: ActivityListFilter = null) {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['activity', 'follows', type ?? 'all'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(ACTIVITY_PAGE_SIZE),
        offset: String(pageParam),
      });
      if (type) params.set('type', type);
      return apiFetch<FollowActivityResponse>(
        `/api/activity?${params.toString()}`,
        {},
        session?.access_token,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + (page.events?.length ?? 0), 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!session,
  });
}
