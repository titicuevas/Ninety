import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule, CapsulesResponse, CreateCapsuleInput, FeedCapsule, FeedResponse, UpdateCapsuleInput } from '@/types/capsule';

const FEED_PAGE_SIZE = 20;
const MY_CAPSULES_PAGE_SIZE = 20;

export type MyCapsulesVisibility = 'all' | 'public' | 'private';

export type MyCapsulesFilters = {
  q?: string;
  year?: number;
  ratingMin?: number;
  visibility?: MyCapsulesVisibility;
};

function buildMyCapsulesQuery(filters: MyCapsulesFilters, offset: number): string {
  const params = new URLSearchParams();
  params.set('limit', String(MY_CAPSULES_PAGE_SIZE));
  params.set('offset', String(offset));
  const q = filters.q?.trim();
  if (q && q.length >= 2) params.set('q', q);
  if (filters.year != null) params.set('year', String(filters.year));
  if (filters.ratingMin != null) params.set('rating_min', String(filters.ratingMin));
  if (filters.visibility && filters.visibility !== 'all') {
    params.set('visibility', filters.visibility);
  }
  return `/api/capsules/me?${params.toString()}`;
}

export function useCapsules() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', 'me'],
    queryFn: () => apiFetch<CapsulesResponse>('/api/capsules/me', {}, session?.access_token),
    enabled: !!session,
  });
}

/** Listado paginado de Mis Capsules (no usar en Wrapped/Home). */
export function useMyCapsulesInfinite(filters: MyCapsulesFilters = {}) {
  const session = useAuthStore((s) => s.session);
  const q = filters.q?.trim() ?? '';
  const year = filters.year;
  const ratingMin = filters.ratingMin;
  const visibility = filters.visibility ?? 'all';

  return useInfiniteQuery({
    queryKey: ['capsules', 'me', 'page', { q, year, ratingMin, visibility }],
    queryFn: ({ pageParam }) =>
      apiFetch<CapsulesResponse>(
        buildMyCapsulesQuery({ q, year, ratingMin, visibility }, pageParam),
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.capsules.length, 0);
      const total = lastPage.total ?? loaded;
      return loaded < total ? loaded : undefined;
    },
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

  return useInfiniteQuery({
    queryKey: ['capsules', 'feed'],
    queryFn: ({ pageParam }) =>
      apiFetch<FeedResponse>(
        `/api/capsules/feed?limit=${FEED_PAGE_SIZE}&offset=${pageParam}`,
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.capsules.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
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
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed']);

      const updateCapsule = <T extends { id: string; likes_count?: number; liked_by_me?: boolean }>(c: T): T =>
        c.id === capsuleId
          ? {
              ...c,
              liked_by_me: !liked,
              likes_count: Math.max(0, (c.likes_count ?? 0) + (liked ? -1 : 1)),
            }
          : c;

      queryClient.setQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed'], (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                capsules: page.capsules.map(updateCapsule),
              })),
            }
          : old,
      );

      queryClient.setQueriesData<InfiniteData<{ capsules: FeedCapsule[] }>>(
        { queryKey: ['profile', 'public'] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  capsules: page.capsules.map(updateCapsule),
                })),
              }
            : old,
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
