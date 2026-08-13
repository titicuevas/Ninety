import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type { CollectionComment, CollectionCommentsResponse } from '@/types/collectionComment';

export function useCollectionComments(collectionId: string, enabled: boolean) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['collections', collectionId, 'comments', session?.access_token ? 'auth' : 'guest'],
    queryFn: () =>
      apiFetch<CollectionCommentsResponse>(
        `/api/collections/${collectionId}/comments`,
        {},
        session?.access_token,
      ),
    enabled: !!collectionId && enabled,
  });
}

export function useAddCollectionComment(collectionId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string | null }) =>
      apiFetch<CollectionComment>(
        `/api/collections/${collectionId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            body,
            ...(parentId ? { parent_id: parentId } : {}),
          }),
        },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections', collectionId, 'comments'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el comentario');
    },
  });
}

export function useUpdateCollectionComment(collectionId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      apiFetch<CollectionComment>(
        `/api/collections/${collectionId}/comments/${commentId}`,
        { method: 'PATCH', body: JSON.stringify({ body }) },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections', collectionId, 'comments'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo editar el comentario');
    },
  });
}

export function useDeleteCollectionComment(collectionId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiFetch<void>(
        `/api/collections/${collectionId}/comments/${commentId}`,
        { method: 'DELETE' },
        session?.access_token,
      ),
    onSuccess: () => {
      toast.success('Comentario borrado');
      void queryClient.invalidateQueries({ queryKey: ['collections', collectionId, 'comments'] });
    },
    onError: () => {
      toast.error('No se pudo borrar el comentario');
    },
  });
}
