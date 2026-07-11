import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule } from '@/types/capsule';
import type { Profile } from '@/types/profile';

interface UserCapsulesResponse {
  profile: Profile;
  capsules: Capsule[];
}

export function usePublicProfile(username: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['profile', 'public', username],
    queryFn: () =>
      apiFetch<UserCapsulesResponse>(`/api/capsules/user/${encodeURIComponent(username!)}`, {}, session?.access_token),
    enabled: !!session && !!username,
  });
}
