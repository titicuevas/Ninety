import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/profile';

export interface TeamFansResponse {
  team: string;
  slug: string;
  total: number;
  profiles: Profile[];
}

const TEAM_FANS_PAGE_SIZE = 30;

export function useTeamFansInfinite(slug: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['profile', 'by-team', slug, session?.user?.id ?? 'guest'],
    enabled: !!slug && !!session?.access_token,
    queryFn: ({ pageParam }) =>
      apiFetch<TeamFansResponse>(
        `/api/profile/by-team?slug=${encodeURIComponent(slug!)}&limit=${TEAM_FANS_PAGE_SIZE}&offset=${pageParam}`,
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.profiles.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}
