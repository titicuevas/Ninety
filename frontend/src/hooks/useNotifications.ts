import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

export interface NotificationActor {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface AppNotification {
  id: string;
  type: 'like' | 'follow' | 'comment';
  actor_id: string;
  capsule_id: string | null;
  /** Snippet del comentario (si type=comment). */
  body?: string | null;
  read: boolean;
  created_at: string;
  actor: NotificationActor | null;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
  total: number;
}

const QUERY_KEY = ['notifications'] as const;
const PAGE_SIZE = 30;

export function useNotifications() {
  const session = useAuthStore((s) => s.session);
  return useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageParam),
      });
      return apiFetch<NotificationsResponse>(
        `/api/notifications?${params.toString()}`,
        {},
        session?.access_token,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.notifications.length, 0);
      const total = lastPage.total ?? loaded;
      return loaded < total ? loaded : undefined;
    },
    enabled: !!session,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return data?.pages[0]?.unread_count ?? 0;
}

export function useMarkAllRead() {
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' }, session?.access_token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Todas marcadas como leídas');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudieron marcar como leídas');
    },
  });
}

export function useMarkNotificationsRead() {
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<{ ok: boolean }>(
        '/api/notifications/read',
        { method: 'POST', body: JSON.stringify({ ids }) },
        session?.access_token,
      ),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<InfiniteData<NotificationsResponse>>(QUERY_KEY);
      qc.setQueryData<InfiniteData<NotificationsResponse>>(QUERY_KEY, (old) => {
        if (!old) return old;
        const idSet = new Set(ids);
        let unreadDelta = 0;
        const pages = old.pages.map((page) => ({
          ...page,
          notifications: page.notifications.map((n) => {
            if (!idSet.has(n.id) || n.read) return n;
            unreadDelta += 1;
            return { ...n, read: true };
          }),
        }));
        return {
          ...old,
          pages: pages.map((page, index) =>
            index === 0
              ? { ...page, unread_count: Math.max(0, page.unread_count - unreadDelta) }
              : page,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) qc.setQueryData(QUERY_KEY, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useClearReadNotifications() {
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; deleted: number }>(
        '/api/notifications/read',
        { method: 'DELETE' },
        session?.access_token,
      ),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<InfiniteData<NotificationsResponse>>(QUERY_KEY);
      qc.setQueryData<InfiniteData<NotificationsResponse>>(QUERY_KEY, (old) => {
        if (!old) return old;
        const pages = old.pages.map((page) => {
          const notifications = page.notifications.filter((n) => !n.read);
          return {
            ...page,
            notifications,
            total: Math.max(0, (page.total ?? 0) - (page.notifications.length - notifications.length)),
          };
        });
        return { ...old, pages };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(QUERY_KEY, context.previous);
      toast.error('No se pudieron limpiar las leídas');
    },
    onSuccess: () => {
      toast.success('Notificaciones leídas eliminadas');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
