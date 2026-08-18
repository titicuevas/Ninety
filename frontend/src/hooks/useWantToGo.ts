import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type {
  AddWantToGoInput,
  PublicWantToGoResponse,
  WantToGoIdsResponse,
  WantToGoListResponse,
  WantToGoMatch,
} from '@/types/wantToGo';

const LIST_KEY = ['want-to-go', 'me'] as const;
const IDS_KEY = ['want-to-go', 'me', 'ids'] as const;

export type WantToGoInCommonProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function useWantToGoInCommon(matchId: number | undefined) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['want-to-go', 'in-common', matchId],
    queryFn: () =>
      apiFetch<{ profiles: WantToGoInCommonProfile[]; total: number }>(
        `/api/want-to-go/me/${matchId}/following`,
        {},
        session?.access_token,
      ),
    enabled: !!session && matchId != null && Number.isFinite(matchId),
  });
}

export function useWantToGoList() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () =>
      apiFetch<WantToGoListResponse>('/api/want-to-go/me?limit=100', {}, session?.access_token),
    enabled: !!session,
  });
}

export function useWantToGoIds() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: IDS_KEY,
    queryFn: () =>
      apiFetch<WantToGoIdsResponse>('/api/want-to-go/me/ids', {}, session?.access_token),
    enabled: !!session,
  });
}

export function usePublicWantToGo(username: string | undefined, limit = 24) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['want-to-go', 'user', username, limit, session?.access_token ?? 'guest'],
    queryFn: () =>
      apiFetch<PublicWantToGoResponse>(
        `/api/want-to-go/user/${encodeURIComponent(username!)}?limit=${limit}`,
        {},
        session?.access_token,
      ),
    enabled: !!username,
  });
}

export function useAddWantToGo() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddWantToGoInput) =>
      apiFetch<{ item: WantToGoMatch }>(
        '/api/want-to-go',
        { method: 'POST', body: JSON.stringify(input) },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['want-to-go'] });
      toast.success('Guardado en Quiero ir');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    },
  });
}

export function useRemoveWantToGo() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: number) =>
      apiFetch<{ ok: boolean; match_id: number }>(
        `/api/want-to-go/${matchId}`,
        { method: 'DELETE' },
        session?.access_token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['want-to-go'] });
      toast.success('Quitado de Quiero ir');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo quitar');
    },
  });
}

export function useClearPlayedWantToGo() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; removed: number }>(
        '/api/want-to-go/played',
        { method: 'DELETE' },
        session?.access_token,
      ),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['want-to-go'] });
      if (data.removed === 0) {
        toast.success('Nada que limpiar');
        return;
      }
      toast.success(
        data.removed === 1
          ? 'Quitado 1 partido ya jugado'
          : `Quitados ${data.removed} partidos ya jugados`,
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo limpiar');
    },
  });
}
