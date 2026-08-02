import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { LIKES_PAGE_SIZE, buildCapsuleLikesQuery } from '@/lib/capsuleLikes';
import { useAuthStore } from '@/stores/authStore';
import type { CapsuleLikesResponse } from '@/types/like';

export function useCapsuleLikes(capsuleId: string, enabled: boolean) {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['capsules', capsuleId, 'likes', session?.access_token ? 'auth' : 'guest'],
    queryFn: ({ pageParam }) =>
      apiFetch<CapsuleLikesResponse>(
        `/api/capsules/${capsuleId}/likes?${buildCapsuleLikesQuery(pageParam)}`,
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.likes.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: enabled && !!capsuleId,
  });
}

export { LIKES_PAGE_SIZE };
