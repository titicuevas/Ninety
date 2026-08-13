import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { toast } from '../lib/toast';
import { useAuthStore } from '../stores/authStore';
import type { Profile, UpdateProfileInput } from '../types/profile';

export function useProfile() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => apiFetch<Profile>('/api/profile/me', {}, session?.access_token),
    enabled: !!session,
    refetchOnWindowFocus: true,
    // Sincroniza cambios desde otro dispositivo sin suscripción directa a Supabase en el navegador.
    refetchInterval: 60_000,
  });
}

export function useUpdateProfile() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<Profile>(
        '/api/profile/me',
        { method: 'PATCH', body: JSON.stringify(input) },
        session?.access_token,
      ),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile', 'me'], profile);
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el perfil');
    },
  });
}
