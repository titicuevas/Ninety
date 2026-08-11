import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import {
  normalizeNotificationAlertPreferences,
  type NotificationAlertPreferences,
  type NotificationAlertType,
} from '@/lib/notificationAlertPreferences';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

const QUERY_KEY = ['notifications', 'preferences'] as const;

export function useNotificationAlertPreferences() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: QUERY_KEY,
    enabled: !!session?.access_token,
    queryFn: async () => {
      const data = await apiFetch<Partial<NotificationAlertPreferences>>(
        '/api/notifications/preferences',
        {},
        session?.access_token,
      );
      return normalizeNotificationAlertPreferences(data);
    },
  });
}

export function useUpdateNotificationAlertPreferences() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<NotificationAlertPreferences>) => {
      const data = await apiFetch<Partial<NotificationAlertPreferences>>(
        '/api/notifications/preferences',
        { method: 'PATCH', body: JSON.stringify(patch) },
        session?.access_token,
      );
      return normalizeNotificationAlertPreferences(data);
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationAlertPreferences>(QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<NotificationAlertPreferences>(QUERY_KEY, {
          ...previous,
          ...patch,
        });
      }
      return { previous };
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : 'No se pudieron guardar las preferencias');
    },
    onSuccess: (data, patch) => {
      queryClient.setQueryData(QUERY_KEY, data);
      const muted = (Object.keys(patch) as NotificationAlertType[]).find((key) => patch[key] === false);
      const enabled = (Object.keys(patch) as NotificationAlertType[]).find((key) => patch[key] === true);
      if (muted) {
        toast.success('Tipo de alerta silenciado');
      } else if (enabled) {
        toast.success('Tipo de alerta activado');
      }
    },
  });
}
