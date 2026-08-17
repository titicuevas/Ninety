import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';
import { useAuthStore } from '@/stores/authStore';

export function useCapsuleAlsoLiked(capsuleId: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', capsuleId, 'also-liked'],
    queryFn: () =>
      apiFetch<{ people: CollectionAlsoLikedPerson[]; total: number }>(
        `/api/capsules/${capsuleId}/likes/following`,
        {},
        session?.access_token,
      ),
    enabled: !!session && !!capsuleId,
  });
}
