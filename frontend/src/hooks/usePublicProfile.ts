import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule } from '@/types/capsule';
import type { Profile } from '@/types/profile';

const PUBLIC_PROFILE_PAGE_SIZE = 20;

interface UserCapsulesResponse {
  profile: Profile;
  capsules: Capsule[];
  total: number;
}

export function usePublicProfile(username: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['profile', 'public', username, session?.access_token ?? 'guest'],
    queryFn: ({ pageParam }) =>
      apiFetch<UserCapsulesResponse>(
        `/api/capsules/user/${encodeURIComponent(username!)}?limit=${PUBLIC_PROFILE_PAGE_SIZE}&offset=${pageParam}`,
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.capsules.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!username,
  });
}
