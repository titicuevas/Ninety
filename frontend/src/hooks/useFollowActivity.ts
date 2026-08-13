import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { FollowActivityResponse } from '@/types/activity';

const ACTIVITY_PAGE_SIZE = 20;

export function useFollowActivity() {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['activity', 'follows'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(ACTIVITY_PAGE_SIZE),
        offset: String(pageParam),
      });
      return apiFetch<FollowActivityResponse>(
        `/api/activity?${params.toString()}`,
        {},
        session?.access_token,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.events.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!session,
  });
}
