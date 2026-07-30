import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
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
      const previousComments = queryClient.getQueriesData<CapsuleCommentsResponse>({
        queryKey: ['capsules', capsuleId, 'comments'],
      });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed']);

      queryClient.setQueriesData<CapsuleCommentsResponse>(
        { queryKey: ['capsules', capsuleId, 'comments'] },
        (old) => (old ? { comments: old.comments.filter((c) => c.id !== commentId) } : old),
      );

      queryClient.setQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed'], (old) =>
        bumpFeedCommentCount(old, capsuleId, -1),
      );

      return { previousComments, previousFeed };
    },
    onError: (_err, _commentId, context) => {
      context?.previousComments?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousFeed) {
        queryClient.setQueryData(['capsules', 'feed'], context.previousFeed);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules', capsuleId, 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
    },
  });
}
