import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/profile';

export type FollowListKind = 'followers' | 'following';

export interface FollowListResponse {
  profiles: Profile[];
  total: number;
  kind: FollowListKind;
  username: string;
}

const FOLLOW_LIST_PAGE_SIZE = 30;

/** Resumen ligero (p. ej. Home: ¿sigue a alguien?). */
export function useFollowList(username: string | undefined, kind: FollowListKind) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['profile', kind, username, session?.user?.id ?? 'guest', 'summary'],
    enabled: !!username,
    queryFn: () =>
      apiFetch<FollowListResponse>(
        `/api/profile/${encodeURIComponent(username!)}/${kind}?limit=1&offset=0`,
        undefined,
        session?.access_token,
      ),
  });
}

/** Lista paginada de seguidores / siguiendo. */
export function useFollowListInfinite(username: string | undefined, kind: FollowListKind) {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['profile', kind, username, session?.user?.id ?? 'guest', 'page'],
    enabled: !!username,
    queryFn: ({ pageParam }) =>
      apiFetch<FollowListResponse>(
        `/api/profile/${encodeURIComponent(username!)}/${kind}?limit=${FOLLOW_LIST_PAGE_SIZE}&offset=${pageParam}`,
        undefined,
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + (page.profiles?.length ?? 0), 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}
