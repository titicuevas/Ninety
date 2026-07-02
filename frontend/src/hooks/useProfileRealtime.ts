import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/profile';

/** Sincroniza el perfil en tiempo real cuando se actualiza desde otro dispositivo. */
export function useProfileRealtime() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const onPayload = useCallback(
    (payload: RealtimePostgresChangesPayload<Profile>) => {
      if (payload.new) {
        queryClient.setQueryData(['profile', 'me'], payload.new);
      }
    },
    [queryClient],
  );

  useRealtime<Profile>({
    table: 'profiles',
    event: 'UPDATE',
    filter: userId ? `id=eq.${userId}` : undefined,
    enabled: !!userId,
    onPayload,
  });
}
