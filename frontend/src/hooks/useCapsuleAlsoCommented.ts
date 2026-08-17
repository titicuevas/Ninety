import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';
import { useAuthStore } from '@/stores/authStore';

export function useCapsuleAlsoCommented(capsuleId: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', capsuleId, 'also-commented'],
    queryFn: () =>
      apiFetch<{ people: CollectionAlsoLikedPerson[]; total: number }>(
        `/api/capsules/${capsuleId}/comments/following`,
        {},
        session?.access_token,
      ),
    enabled: !!session && !!capsuleId,
  });
}
