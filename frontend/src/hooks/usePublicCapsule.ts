import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { PublicCapsule } from '@/types/capsule';

export function usePublicCapsule(id: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', 'public', id, session?.access_token ? 'auth' : 'guest'],
    queryFn: () => apiFetch<PublicCapsule>(`/api/capsules/${id}`, {}, session?.access_token),
    enabled: !!id,
  });
}
