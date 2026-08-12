import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import {
  normalizeNotificationAlertPreferences,
  type NotificationAlertPreferences,
  type NotificationAlertPreferencesPatch,
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
    mutationFn: async (patch: NotificationAlertPreferencesPatch) => {
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
          push_quiet: patch.push_quiet
            ? { ...previous.push_quiet, ...patch.push_quiet }
            : previous.push_quiet,
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
      if (patch.push_anniversary === true) {
        toast.success('Push de aniversarios activado');
        return;
      }
      if (patch.push_anniversary === false) {
        toast.success('Push de aniversarios desactivado');
        return;
      }
      if (patch.push_milestone === true) {
        toast.success('Push de hitos activado');
        return;
      }
      if (patch.push_milestone === false) {
        toast.success('Push de hitos desactivado');
        return;
      }
      if (patch.push_want_to_go === true) {
        toast.success('Recordatorio Quiero ir activado');
        return;
      }
      if (patch.push_want_to_go === false) {
        toast.success('Recordatorio Quiero ir desactivado');
        return;
      }
      if (patch.email_digest === true) {
        toast.success('Resumen semanal por email activado');
        return;
      }
      if (patch.email_digest === false) {
        toast.success('Resumen semanal por email desactivado');
        return;
      }
      if (patch.push_quiet) {
        if (patch.push_quiet.enabled === true) {
          toast.success('Horario silencioso activado');
        } else if (patch.push_quiet.enabled === false) {
          toast.success('Horario silencioso desactivado');
        } else {
          toast.success('Horario silencioso actualizado');
        }
        return;
      }
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
