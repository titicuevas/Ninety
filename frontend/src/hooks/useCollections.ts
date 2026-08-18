import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/lib/api';
import { nextLikedPageOffset } from '@/lib/capsuleLikes';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type {
  Collection,
  CollectionDetailResponse,
  CollectionsListResponse,
  CreateCollectionInput,
  LikedCollectionsResponse,
  PublicCollectionsResponse,
  UpdateCollectionInput,
} from '@/types/collection';

export function useMyCollections() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['collections', 'me'],
    queryFn: () => apiFetch<CollectionsListResponse>('/api/collections/me', {}, session?.access_token),
    enabled: !!session,
  });
}

export function useLikedCollectionsInfinite() {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['collections', 'liked'],
    queryFn: ({ pageParam }) =>
      apiFetch<LikedCollectionsResponse>(
        `/api/collections/me/liked?limit=20&offset=${pageParam}`,
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => nextLikedPageOffset(lastPage),
    enabled: !!session,
  });
}

/** Colecciones propias que ya contienen una Capsule concreta. */
export function useCollectionMemberships(capsuleId: string | undefined, enabled = true) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['collections', 'containing', capsuleId],
    queryFn: () =>
      apiFetch<{ collection_ids: string[] }>(
        `/api/collections/me/containing/${encodeURIComponent(capsuleId!)}`,
        {},
        session?.access_token,
      ),
    enabled: !!session && !!capsuleId && enabled,
  });
}

export function useCollectionDetail(id: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['collections', 'detail', id],
    queryFn: () =>
      apiFetch<CollectionDetailResponse>(`/api/collections/${id}`, {}, session?.access_token),
    enabled: !!id && !!session,
  });
}

export function usePublicCollections(username: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['collections', 'user', username, session?.access_token ?? 'guest'],
    queryFn: () =>
      apiFetch<PublicCollectionsResponse>(
        `/api/collections/user/${encodeURIComponent(username!)}`,
        {},
        session?.access_token,
      ),
    enabled: !!username,
  });
}

export function usePublicCollection(username: string | undefined, slug: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['collections', 'user', username, slug, session?.access_token ?? 'guest'],
    queryFn: () =>
      apiFetch<CollectionDetailResponse>(
        `/api/collections/user/${encodeURIComponent(username!)}/${encodeURIComponent(slug!)}`,
        {},
        session?.access_token,
      ),
    enabled: !!username && !!slug,
  });
}

export function useCreateCollection() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCollectionInput) =>
      apiFetch<{ collection: Collection }>(
        '/api/collections',
        { method: 'POST', body: JSON.stringify(input) },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la colección');
    },
  });
}

export function useUpdateCollection(id: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCollectionInput) =>
      apiFetch<{ collection: Collection }>(
        `/api/collections/${id}`,
        { method: 'PATCH', body: JSON.stringify(input) },
        session?.access_token,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData<CollectionDetailResponse>(['collections', 'detail', id], (old) =>
        old ? { ...old, collection: { ...old.collection, ...data.collection } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Colección actualizada');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar');
    },
  });
}

export function useDeleteCollection() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/collections/${id}`, { method: 'DELETE' }, session?.access_token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Colección eliminada');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
    },
  });
}

export function useAddCollectionItem(collectionId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (capsuleId: string) =>
      apiFetch(
        `/api/collections/${collectionId}/items`,
        { method: 'POST', body: JSON.stringify({ capsule_id: capsuleId }) },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Capsule añadida');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo añadir');
    },
  });
}

/** Añadir Capsule a cualquier colección (p. ej. desde el diario). 409 = ya estaba. */
export function useAddCapsuleToCollection() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, capsuleId }: { collectionId: string; capsuleId: string }) =>
      apiFetch(
        `/api/collections/${collectionId}/items`,
        { method: 'POST', body: JSON.stringify({ capsule_id: capsuleId }) },
        session?.access_token,
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
      void queryClient.invalidateQueries({
        queryKey: ['collections', 'containing', vars.capsuleId],
      });
      toast.success('Añadida a la colección');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) return;
      toast.error(err instanceof Error ? err.message : 'No se pudo añadir');
    },
  });
}

export function useRemoveCollectionItem(collectionId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (capsuleId: string) =>
      apiFetch<void>(
        `/api/collections/${collectionId}/items/${capsuleId}`,
        { method: 'DELETE' },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Capsule quitada');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo quitar');
    },
  });
}

/** Reordenar Capsules de una colección (sin toast de éxito: evita spam al subir/bajar). */
export function useReorderCollectionItems(collectionId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (capsuleIds: string[]) =>
      apiFetch<{ items: { collection_id: string; capsule_id: string; position: number }[] }>(
        `/api/collections/${collectionId}/items/reorder`,
        { method: 'PUT', body: JSON.stringify({ capsule_ids: capsuleIds }) },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo reordenar');
    },
  });
}

export function useRemoveCapsuleFromCollection() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, capsuleId }: { collectionId: string; capsuleId: string }) =>
      apiFetch<void>(
        `/api/collections/${collectionId}/items/${capsuleId}`,
        { method: 'DELETE' },
        session?.access_token,
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
      void queryClient.invalidateQueries({
        queryKey: ['collections', 'containing', vars.capsuleId],
      });
      toast.success('Quitada de la colección');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo quitar');
    },
  });
}

export function useToggleCollectionLike() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, liked }: { collectionId: string; liked: boolean }) => {
      const path = `/api/collections/${collectionId}/like`;
      if (liked) {
        await apiFetch<void>(path, { method: 'DELETE' }, session?.access_token);
        return;
      }
      await apiFetch<{ liked: boolean }>(path, { method: 'POST' }, session?.access_token);
    },
    onMutate: async ({ collectionId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });

      const previous = queryClient.getQueriesData({ queryKey: ['collections'] });

      const patchCollection = <T extends { id: string; likes_count?: number; liked_by_me?: boolean }>(
        c: T,
      ): T =>
        c.id === collectionId
          ? {
              ...c,
              liked_by_me: !liked,
              likes_count: Math.max(0, (c.likes_count ?? 0) + (liked ? -1 : 1)),
            }
          : c;

      for (const [key, data] of previous) {
        if (!data || typeof data !== 'object') continue;

        if ('collection' in data && data.collection && typeof data.collection === 'object') {
          const detail = data as CollectionDetailResponse;
          queryClient.setQueryData(key, {
            ...detail,
            collection: patchCollection(detail.collection),
          });
          continue;
        }

        if ('pages' in data && Array.isArray((data as { pages: unknown }).pages)) {
          const inf = data as { pages: unknown[]; pageParams: unknown[] };
          queryClient.setQueryData(key, {
            ...inf,
            pages: inf.pages.map((page) => {
              if (!page || typeof page !== 'object' || !('collections' in page)) return page;
              const list = page as { collections: Collection[]; total?: number };
              const patched = list.collections.map(patchCollection);
              const collections = liked
                ? patched.filter((collection) => collection.id !== collectionId)
                : patched;
              const removed = liked && collections.length !== patched.length ? 1 : 0;
              return {
                ...list,
                collections,
                total:
                  typeof list.total === 'number' ? Math.max(0, list.total - removed) : list.total,
              };
            }),
          });
          continue;
        }

        if ('collections' in data && Array.isArray((data as { collections: unknown }).collections)) {
          const list = data as { collections: Collection[] };
          queryClient.setQueryData(key, {
            ...list,
            collections: list.collections.map(patchCollection),
          });
        }
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.previous) {
        queryClient.setQueryData(key, data);
      }
      toast.error('No se pudo actualizar el me gusta');
    },
    onSuccess: (_data, { liked }) => {
      if (!liked) toast.success('Me gusta añadido');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}
