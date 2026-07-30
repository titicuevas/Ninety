import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface PushPublicKeyResponse {
  publicKey: string;
  enabled: boolean;
}

export interface PushSupportStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function usePushPublicKey() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['notifications', 'push-public-key'],
    queryFn: () =>
      apiFetch<PushPublicKeyResponse>('/api/notifications/push/public-key', {}, session?.access_token),
    enabled: !!session?.access_token,
    retry: false,
    staleTime: 10 * 60_000,
  });
}

export function usePushSupport() {
  return useQuery({
    queryKey: ['notifications', 'push-support'],
    queryFn: async (): Promise<PushSupportStatus> => {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return { supported: false, permission: 'unsupported' };
      }
      return { supported: true, permission: Notification.permission };
    },
    staleTime: Infinity,
    initialData: { supported: false, permission: 'unsupported' as const },
  });
}

export function usePushEnabled() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ['notifications', 'push-enabled'],
    queryFn: async () => {
      if (!session?.access_token || !('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    },
    enabled: !!session?.access_token,
    staleTime: Infinity,
    initialData: false,
  });
}

export function useEnablePush() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        throw new Error('Este navegador no soporta notificaciones push');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }

      const keyData = await apiFetch<PushPublicKeyResponse>(
        '/api/notifications/push/public-key',
        {},
        session?.access_token,
      );

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      const json = subscription.toJSON();
      await apiFetch(
        '/api/notifications/push/subscribe',
        {
          method: 'POST',
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        },
        session?.access_token,
      );

      return true;
    },
    onSuccess: () => {
      queryClient.setQueryData(['notifications', 'push-enabled'], true);
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'push-public-key'] });
    },
  });
}

export function useDisablePush() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator)) return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return false;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await apiFetch(
        '/api/notifications/push/subscribe',
        {
          method: 'DELETE',
          body: JSON.stringify({ endpoint }),
        },
        session?.access_token,
      );

      return true;
    },
    onSuccess: () => {
      queryClient.setQueryData(['notifications', 'push-enabled'], false);
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'push-public-key'] });
    },
  });
}
