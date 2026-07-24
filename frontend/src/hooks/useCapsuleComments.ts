import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
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

export function useAddCapsuleComment(capsuleId: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<CapsuleComment>(
        `/api/capsules/${capsuleId}/comments`,
        { method: 'POST', body: JSON.stringify({ body }) },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules', capsuleId, 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
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
      const previous = queryClient.getQueryData<CapsuleCommentsResponse>(['capsules', capsuleId, 'comments']);

      queryClient.setQueryData<CapsuleCommentsResponse>(['capsules', capsuleId, 'comments'], (old) =>
        old ? { comments: old.comments.filter((c) => c.id !== commentId) } : old,
      );

      queryClient.setQueryData<FeedResponse>(['capsules', 'feed'], (old) =>
        old
          ? {
              ...old,
              capsules: old.capsules.map((c) =>
                c.id === capsuleId
                  ? { ...c, comments_count: Math.max(0, (c.comments_count ?? 0) - 1) }
                  : c,
              ),
            }
          : old,
      );

      return { previous };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['capsules', capsuleId, 'comments'], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules', capsuleId, 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
    },
  });
}
