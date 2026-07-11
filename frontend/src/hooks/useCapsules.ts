import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule, CapsulesResponse, CreateCapsuleInput, FeedCapsule, FeedResponse, UpdateCapsuleInput } from '@/types/capsule';

export function useCapsules() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', 'me'],
    queryFn: () => apiFetch<CapsulesResponse>('/api/capsules/me', {}, session?.access_token),
    enabled: !!session,
  });
}

export function useCreateCapsule() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCapsuleInput) =>
      apiFetch<Capsule>('/api/capsules', { method: 'POST', body: JSON.stringify(input) }, session?.access_token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
    },
  });
}

export function useCapsuleFeed() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', 'feed'],
    queryFn: () => apiFetch<FeedResponse>('/api/capsules/feed?limit=30', {}, session?.access_token),
    enabled: !!session,
  });
}

export function useToggleCapsuleLike() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ capsuleId, liked }: { capsuleId: string; liked: boolean }) => {
      const path = `/api/capsules/${capsuleId}/like`;
      if (liked) {
        await apiFetch<void>(path, { method: 'DELETE' }, session?.access_token);
        return;
      }
      await apiFetch<{ liked: boolean }>(path, { method: 'POST' }, session?.access_token);
    },
    onMutate: async ({ capsuleId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ['capsules', 'feed'] });
      const previousFeed = queryClient.getQueryData<FeedResponse>(['capsules', 'feed']);

      const updateCapsule = <T extends { id: string; likes_count?: number; liked_by_me?: boolean }>(c: T): T =>
        c.id === capsuleId
          ? {
              ...c,
              liked_by_me: !liked,
              likes_count: Math.max(0, (c.likes_count ?? 0) + (liked ? -1 : 1)),
            }
          : c;

      queryClient.setQueryData<FeedResponse>(['capsules', 'feed'], (old) =>
        old ? { ...old, capsules: old.capsules.map(updateCapsule) } : old,
      );

      queryClient.setQueriesData<{ profile: unknown; capsules: FeedCapsule[] }>(
        { queryKey: ['profile', 'public'] },
        (old) => (old ? { ...old, capsules: old.capsules.map(updateCapsule) } : old),
      );

      return { previousFeed };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['capsules', 'feed'], context.previousFeed);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
    },
  });
}

export function useCapsule(id: string | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', id],
    queryFn: () => apiFetch<Capsule>(`/api/capsules/${id}`, {}, session?.access_token),
    enabled: !!session && !!id,
  });
}

export function useUpdateCapsule(id: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCapsuleInput) =>
      apiFetch<Capsule>(`/api/capsules/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, session?.access_token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules'] });
    },
  });
}

export function useDeleteCapsule() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/capsules/${id}`, { method: 'DELETE' }, session?.access_token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['capsules'] });
    },
  });
}
