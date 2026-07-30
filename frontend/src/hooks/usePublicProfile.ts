import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule } from '@/types/capsule';
import type { Profile } from '@/types/profile';
import type { PublicProfileStats } from '@/types/publicProfile';
import type { WatchContext } from '@/lib/watchContext';

const PUBLIC_PROFILE_PAGE_SIZE = 20;

export type PublicProfileFilters = {
  q?: string;
  year?: number;
  ratingMin?: number;
  watchContext?: WatchContext;
};

interface UserCapsulesResponse {
  profile: Profile;
  capsules: Capsule[];
  total: number;
  stats?: PublicProfileStats;
  years?: number[];
}

function buildPublicProfileQuery(username: string, filters: PublicProfileFilters, offset: number): string {
  const params = new URLSearchParams();
  params.set('limit', String(PUBLIC_PROFILE_PAGE_SIZE));
  params.set('offset', String(offset));
  const q = filters.q?.trim();
  if (q && q.length >= 2) params.set('q', q);
  if (filters.year != null) params.set('year', String(filters.year));
  if (filters.ratingMin != null) params.set('rating_min', String(filters.ratingMin));
  if (filters.watchContext) params.set('watch_context', filters.watchContext);
  return `/api/capsules/user/${encodeURIComponent(username)}?${params.toString()}`;
}

export function usePublicProfile(username: string | undefined, filters: PublicProfileFilters = {}) {
  const session = useAuthStore((s) => s.session);
  const q = filters.q?.trim() ?? '';
  const year = filters.year;
  const ratingMin = filters.ratingMin;
  const watchContext = filters.watchContext;

  return useInfiniteQuery({
    queryKey: [
      'profile',
      'public',
      username,
      session?.access_token ?? 'guest',
      { q, year, ratingMin, watchContext },
    ],
    queryFn: ({ pageParam }) =>
      apiFetch<UserCapsulesResponse>(
        buildPublicProfileQuery(username!, { q, year, ratingMin, watchContext }, pageParam),
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
