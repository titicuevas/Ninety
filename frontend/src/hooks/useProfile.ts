import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { Profile } from '../types/profile';

export function useProfile() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => apiFetch<Profile>('/api/profile/me', {}, session?.access_token),
    enabled: !!session,
  });
}
