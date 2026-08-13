import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type { CapsuleComment, CapsuleCommentsResponse } from '@/types/comment';
import type { FeedResponse } from '@/types/capsule';

export function useCapsuleComments(capsuleId: string, enabled: boolean) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', capsuleId, 'comments', session?.access_token ? 'auth' : 'guest'],
    queryFn: () =>
      apiFetch<CapsuleCommentsResponse>(`/api/capsules/${capsuleId}/comments`, {}, session?.access_token),
    enabled,
  });
}

function bumpFeedCommentCount(
  old: InfiniteData<FeedResponse> | undefined,
  capsuleId: string,
  delta: number,
): InfiniteData<FeedResponse> | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      capsules: page.capsules.map((c) =>
        c.id === capsuleId
          ? { ...c, comments_count: Math.max(0, (c.comments_count ?? 0) + delta) }
          : c,
      ),
    })),
  };
}

export function useAddCapsuleComment(capsuleId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string | null }) =>
      apiFetch<CapsuleComment>(
        `/api/capsules/${capsuleId}/comments`,
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
      queryClient.setQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed'], (old) =>
        bumpFeedCommentCount(old, capsuleId, 1),
      );
      void queryClient.invalidateQueries({ queryKey: ['capsules', capsuleId, 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', capsuleId] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el comentario');
    },
  });
}

export function useDeleteCapsuleComment(capsuleId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiFetch<void>(
        `/api/capsules/${capsuleId}/comments/${commentId}`,
        { method: 'DELETE' },
        session?.access_token,
      ),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['capsules', capsuleId, 'comments'] });
      const previousComments = queryClient.getQueriesData<CapsuleCommentsResponse>({
        queryKey: ['capsules', capsuleId, 'comments'],
      });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed']);

      let removed = 1;
      queryClient.setQueriesData<CapsuleCommentsResponse>(
        { queryKey: ['capsules', capsuleId, 'comments'] },
        (old) => {
          if (!old) return old;
          const target = old.comments.find((c) => c.id === commentId);
          const next = old.comments.filter(
            (c) => c.id !== commentId && c.parent_id !== commentId,
          );
          removed = Math.max(1, old.comments.length - next.length);
          // Si no estaba en cache, al menos 1; si era raíz con replies, count real.
          if (target && !target.parent_id) {
            removed = 1 + old.comments.filter((c) => c.parent_id === commentId).length;
          }
          return { comments: next };
        },
      );

      queryClient.setQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed'], (old) =>
        bumpFeedCommentCount(old, capsuleId, -removed),
      );

      return { previousComments, previousFeed, removed };
    },
    onError: (_err, _commentId, context) => {
      context?.previousComments?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousFeed) {
        queryClient.setQueryData(['capsules', 'feed'], context.previousFeed);
      }
      toast.error('No se pudo borrar el comentario');
    },
    onSuccess: () => {
      toast.success('Comentario borrado');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules', capsuleId, 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
    },
  });
}

export function useUpdateCapsuleComment(capsuleId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      apiFetch<CapsuleComment>(
        `/api/capsules/${capsuleId}/comments/${commentId}`,
        { method: 'PATCH', body: JSON.stringify({ body }) },
        session?.access_token,
      ),
    onMutate: async ({ commentId, body }) => {
      await queryClient.cancelQueries({ queryKey: ['capsules', capsuleId, 'comments'] });
      const previousComments = queryClient.getQueriesData<CapsuleCommentsResponse>({
        queryKey: ['capsules', capsuleId, 'comments'],
      });

      queryClient.setQueriesData<CapsuleCommentsResponse>(
        { queryKey: ['capsules', capsuleId, 'comments'] },
        (old) =>
          old
            ? {
                comments: old.comments.map((c) => (c.id === commentId ? { ...c, body } : c)),
              }
            : old,
      );

      return { previousComments };
    },
    onError: (_err, _vars, context) => {
      context?.previousComments?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('No se pudo editar el comentario');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules', capsuleId, 'comments'] });
    },
  });
}
