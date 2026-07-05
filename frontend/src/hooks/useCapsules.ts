import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule, CapsulesResponse, CreateCapsuleInput, FeedResponse, UpdateCapsuleInput } from '@/types/capsule';

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
