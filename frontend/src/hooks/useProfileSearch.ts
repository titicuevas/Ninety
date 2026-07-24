import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/profile';

export const MIN_PEOPLE_QUERY = 2;

export interface ProfileSearchResponse {
  profiles: Profile[];
  query: string;
}

export function useProfileSearch(query: string) {
  const session = useAuthStore((s) => s.session);
  const q = query.trim();

  return useQuery({
    queryKey: ['profile', 'search', q],
    queryFn: () =>
      apiFetch<ProfileSearchResponse>(
        `/api/profile/search?q=${encodeURIComponent(q)}&limit=12`,
        {},
        session?.access_token,
      ),
    enabled: !!session?.access_token && q.length >= MIN_PEOPLE_QUERY,
  });
}
