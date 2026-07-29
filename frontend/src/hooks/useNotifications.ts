import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
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
  read: boolean;
  created_at: string;
  actor: NotificationActor | null;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

const QUERY_KEY = ['notifications'];

export function useNotifications() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<NotificationsResponse>('/api/notifications', {}, session?.access_token),
    enabled: !!session,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return data?.unread_count ?? 0;
}

export function useMarkAllRead() {
  const session = useAuthStore((s) => s.session);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' }, session?.access_token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
