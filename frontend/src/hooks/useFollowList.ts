import { useQuery } from '@tanstack/react-query';
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

export function useFollowList(username: string | undefined, kind: FollowListKind) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['profile', kind, username, session?.user?.id ?? 'guest'],
    enabled: !!username,
    queryFn: () =>
      apiFetch<FollowListResponse>(
        `/api/profile/${encodeURIComponent(username!)}/${kind}`,
        undefined,
        session?.access_token,
      ),
  });
}
