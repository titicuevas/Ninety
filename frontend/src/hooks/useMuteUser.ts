import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/profile';

interface PublicProfilePage {
  profile: Profile;
  capsules: unknown[];
  total: number;
}

type PublicProfileInfinite = InfiniteData<PublicProfilePage>;

export type MutedProfile = Profile & { muted_at: string };

type MutedListResponse = {
  profiles: MutedProfile[];
  total: number;
};

const MUTED_QUERY_KEY = ['notifications', 'muted'] as const;

function updateProfileMute(profile: Profile, muted: boolean): Profile {
  return { ...profile, muted_by_me: !muted };
}

export function useMutedUsers() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: MUTED_QUERY_KEY,
    enabled: !!session?.access_token,
    queryFn: () =>
      apiFetch<MutedListResponse>('/api/notifications/muted', {}, session?.access_token),
  });
}

export function useToggleMuteUser(username: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ muted }: { muted: boolean }) => {
      const path = `/api/notifications/muted/${encodeURIComponent(username)}`;
      if (muted) {
        await apiFetch<{ muted: boolean }>(path, { method: 'DELETE' }, session?.access_token);
        return { muted: false as const };
      }
      await apiFetch<{ muted: boolean }>(path, { method: 'POST' }, session?.access_token);
      return { muted: true as const };
    },
    onMutate: async ({ muted }) => {
      await queryClient.cancelQueries({ queryKey: ['profile', 'public', username] });
      await queryClient.cancelQueries({ queryKey: MUTED_QUERY_KEY });

      const previousProfiles = queryClient.getQueriesData<PublicProfileInfinite>({
        queryKey: ['profile', 'public', username],
      });
      const previousMuted = queryClient.getQueryData<MutedListResponse>(MUTED_QUERY_KEY);

      queryClient.setQueriesData<PublicProfileInfinite>(
        { queryKey: ['profile', 'public', username] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  profile: updateProfileMute(page.profile, muted),
                })),
              }
            : old,
      );

      if (previousMuted && muted) {
        queryClient.setQueryData<MutedListResponse>(MUTED_QUERY_KEY, {
          ...previousMuted,
          profiles: previousMuted.profiles.filter((p) => p.username !== username),
          total: Math.max(0, previousMuted.total - 1),
        });
      }

      return { previousProfiles, previousMuted };
    },
    onError: (err, _vars, context) => {
      context?.previousProfiles?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousMuted) {
        queryClient.setQueryData(MUTED_QUERY_KEY, context.previousMuted);
      }
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el silencio');
    },
    onSuccess: (data) => {
      if (data.muted) {
        toast.success('Usuario silenciado — sin alertas suyas');
      } else {
        toast.success('Alertas reactivadas');
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public', username] });
      void queryClient.invalidateQueries({ queryKey: MUTED_QUERY_KEY });
    },
  });
}
