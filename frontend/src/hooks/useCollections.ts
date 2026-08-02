import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type {
  Collection,
  CollectionDetailResponse,
  CollectionsListResponse,
  CreateCollectionInput,
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
    queryKey: ['collections', 'user', username],
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
    queryKey: ['collections', 'user', username, slug],
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
      toast.success('Colección creada');
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
    onSuccess: () => {
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
