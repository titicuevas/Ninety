import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/lib/api';
import type { FeedContentFilters, FeedScope, FeedSort } from '@/lib/feedParams';
import { nextLikedPageOffset } from '@/lib/capsuleLikes';
import { mapInfinitePages } from '@/lib/queryCache';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule, CapsulesResponse, CreateCapsuleInput, FeedCapsule, FeedResponse, LikedCapsulesResponse, UpdateCapsuleInput } from '@/types/capsule';

export type { FeedContentFilters, FeedScope, FeedSort } from '@/lib/feedParams';

const FEED_PAGE_SIZE = 20;
const MY_CAPSULES_PAGE_SIZE = 20;

export type MyCapsulesVisibility = 'all' | 'public' | 'private';

export type MyCapsulesFilters = {
  q?: string;
  year?: number;
  ratingMin?: number;
  visibility?: MyCapsulesVisibility;
  watchContext?: 'stadium' | 'tv' | 'pub' | 'other';
  tag?: string;
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
  if (filters.watchContext) params.set('watch_context', filters.watchContext);
  if (filters.tag) params.set('tag', filters.tag);
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
  const watchContext = filters.watchContext;
  const tag = filters.tag;

  return useInfiniteQuery({
    queryKey: ['capsules', 'me', 'page', { q, year, ratingMin, visibility, watchContext, tag }],
    queryFn: ({ pageParam }) =>
      apiFetch<CapsulesResponse>(
        buildMyCapsulesQuery({ q, year, ratingMin, visibility, watchContext, tag }, pageParam),
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + (page.capsules?.length ?? 0), 0);
      const total = lastPage.total ?? loaded;
      return loaded < total ? loaded : undefined;
    },
    enabled: !!session,
  });
}

export function useLikedCapsulesInfinite() {
  const session = useAuthStore((s) => s.session);

  return useInfiniteQuery({
    queryKey: ['capsules', 'liked'],
    queryFn: ({ pageParam }) =>
      apiFetch<LikedCapsulesResponse>(
        `/api/capsules/me/liked?limit=20&offset=${pageParam}`,
        {},
        session?.access_token,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => nextLikedPageOffset(lastPage),
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
      void queryClient.invalidateQueries({ queryKey: ['want-to-go'] });
      toast.success('Capsule guardada');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.capsuleId) return;
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la Capsule');
    },
  });
}

export function useCapsuleFeed(
  scope: FeedScope = 'following',
  sort: FeedSort = 'recent',
  content: FeedContentFilters = { photosOnly: false, competition: '' },
) {
  const session = useAuthStore((s) => s.session);
  const photosOnly = content.photosOnly;
  const competition = content.competition;

  return useInfiniteQuery({
    queryKey: ['capsules', 'feed', scope, sort, photosOnly, competition],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(FEED_PAGE_SIZE),
        offset: String(pageParam),
        scope,
        sort,
      });
      if (photosOnly) params.set('photos', '1');
      if (competition.length >= 2) params.set('competition', competition);
      return apiFetch<FeedResponse>(
        `/api/capsules/feed?${params.toString()}`,
        {},
        session?.access_token,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + (page.capsules?.length ?? 0), 0);
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
      await queryClient.cancelQueries({ queryKey: ['capsules', 'public', capsuleId] });
      await queryClient.cancelQueries({ queryKey: ['capsules', capsuleId] });
      await queryClient.cancelQueries({ queryKey: ['profile', 'public'] });

      const previousFeeds = queryClient.getQueriesData<InfiniteData<FeedResponse>>({
        queryKey: ['capsules', 'feed'],
      });
      const previousPublicProfiles = queryClient.getQueriesData<InfiniteData<{ capsules: FeedCapsule[] }>>({
        queryKey: ['profile', 'public'],
      });
      const previousPublicCapsules = queryClient.getQueriesData({
        queryKey: ['capsules', 'public', capsuleId],
      });
      const previousDetail = queryClient.getQueryData(['capsules', capsuleId]);

      const updateCapsule = <T extends { id: string; likes_count?: number; liked_by_me?: boolean }>(c: T): T =>
        c.id === capsuleId
          ? {
              ...c,
              liked_by_me: !liked,
              likes_count: Math.max(0, (c.likes_count ?? 0) + (liked ? -1 : 1)),
            }
          : c;

      queryClient.setQueriesData<InfiniteData<FeedResponse>>({ queryKey: ['capsules', 'feed'] }, (old) =>
        mapInfinitePages<FeedResponse>(old, (page) => ({
          ...page,
          capsules: (page.capsules ?? []).map(updateCapsule),
        })) as InfiniteData<FeedResponse> | undefined,
      );

      queryClient.setQueriesData<InfiniteData<{ capsules: FeedCapsule[] }>>(
        { queryKey: ['profile', 'public'] },
        (old) =>
          mapInfinitePages<{ capsules: FeedCapsule[] }>(old, (page) => ({
            ...page,
            capsules: (page.capsules ?? []).map(updateCapsule),
          })) as InfiniteData<{ capsules: FeedCapsule[] }> | undefined,
      );

      queryClient.setQueriesData({ queryKey: ['capsules', 'public', capsuleId] }, (old) =>
        old && typeof old === 'object' && 'id' in old
          ? updateCapsule(old as { id: string; likes_count?: number; liked_by_me?: boolean })
          : old,
      );

      queryClient.setQueryData(['capsules', capsuleId], (old) =>
        old && typeof old === 'object' && 'id' in old
          ? updateCapsule(old as { id: string; likes_count?: number; liked_by_me?: boolean })
          : old,
      );

      return {
        previousFeeds,
        previousPublicProfiles,
        previousPublicCapsules,
        previousDetail,
        capsuleId,
      };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.previousFeeds) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, data] of context.previousPublicProfiles) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, data] of context.previousPublicCapsules) {
        queryClient.setQueryData(key, data);
      }
      queryClient.setQueryData(['capsules', context.capsuleId], context.previousDetail);
      toast.error('No se pudo actualizar el me gusta');
    },
    onSuccess: (_data, { liked }) => {
      // liked === false → acabamos de dar like
      if (!liked) toast.success('Me gusta añadido');
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
      toast.success('Cambios guardados');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
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
      toast.success('Capsule eliminada');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la Capsule');
    },
  });
}
