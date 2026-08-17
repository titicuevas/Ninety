import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';
import { useAuthStore } from '@/stores/authStore';

export function useCollectionAlsoCommented(collectionId: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['collections', collectionId, 'also-commented'],
    queryFn: () =>
      apiFetch<{ people: CollectionAlsoLikedPerson[]; total: number }>(
        `/api/collections/${collectionId}/comments/following`,
        {},
        session?.access_token,
      ),
    enabled: !!session && !!collectionId,
  });
}
