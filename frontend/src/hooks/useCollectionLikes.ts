import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { LIKES_PAGE_SIZE, buildCollectionLikesQuery } from '@/lib/collectionLikes';
import { useAuthStore } from '@/stores/authStore';
import type { CollectionLikesResponse } from '@/types/like';

export function useCollectionLikes(collectionId: string, enabled: boolean) {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['collections', collectionId, 'likes', session?.access_token ? 'auth' : 'guest'],
    queryFn: ({ pageParam }) =>
      apiFetch<CollectionLikesResponse>(
        `/api/collections/${collectionId}/likes?${buildCollectionLikesQuery(pageParam)}`,
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.likes.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: enabled && !!collectionId,
  });
}

export { LIKES_PAGE_SIZE };
