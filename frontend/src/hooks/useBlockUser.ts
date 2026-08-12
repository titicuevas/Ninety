import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/profile';

interface PublicProfilePage {
  profile: Profile;
  capsules: unknown[];
  total: number;
  blocked?: boolean;
}

type PublicProfileInfinite = InfiniteData<PublicProfilePage>;

export type BlockedProfile = Profile & { blocked_at: string };

type BlockedListResponse = {
  profiles: BlockedProfile[];
  total: number;
};

const BLOCKED_QUERY_KEY = ['profile', 'blocked'] as const;

function updateProfileBlock(profile: Profile, blocked: boolean): Profile {
  return {
    ...profile,
    blocked_by_me: !blocked,
    followed_by_me: !blocked ? false : profile.followed_by_me,
    follows_me: !blocked ? false : profile.follows_me,
  };
}

export function useBlockedUsers() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: BLOCKED_QUERY_KEY,
    enabled: !!session?.access_token,
    queryFn: () =>
      apiFetch<BlockedListResponse>('/api/profile/blocked', {}, session?.access_token),
  });
}

export function useToggleBlockUser(username: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blocked }: { blocked: boolean }) => {
      const path = `/api/profile/blocked/${encodeURIComponent(username)}`;
      if (blocked) {
        await apiFetch<{ blocked: boolean }>(path, { method: 'DELETE' }, session?.access_token);
        return { blocked: false as const };
      }
      await apiFetch<{ blocked: boolean }>(path, { method: 'POST' }, session?.access_token);
      return { blocked: true as const };
    },
    onMutate: async ({ blocked }) => {
      await queryClient.cancelQueries({ queryKey: ['profile', 'public', username] });
      await queryClient.cancelQueries({ queryKey: BLOCKED_QUERY_KEY });

      const previousProfiles = queryClient.getQueriesData<PublicProfileInfinite>({
        queryKey: ['profile', 'public', username],
      });
      const previousBlocked = queryClient.getQueryData<BlockedListResponse>(BLOCKED_QUERY_KEY);

      queryClient.setQueriesData<PublicProfileInfinite>(
        { queryKey: ['profile', 'public', username] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  profile: updateProfileBlock(page.profile, blocked),
                  capsules: blocked ? page.capsules : [],
                  total: blocked ? page.total : 0,
                  blocked: !blocked,
                })),
              }
            : old,
      );

      if (previousBlocked && blocked) {
        queryClient.setQueryData<BlockedListResponse>(BLOCKED_QUERY_KEY, {
          ...previousBlocked,
          profiles: previousBlocked.profiles.filter((p) => p.username !== username),
          total: Math.max(0, previousBlocked.total - 1),
        });
      }

      return { previousProfiles, previousBlocked };
    },
    onError: (err, _vars, context) => {
      context?.previousProfiles?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousBlocked) {
        queryClient.setQueryData(BLOCKED_QUERY_KEY, context.previousBlocked);
      }
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el bloqueo');
    },
    onSuccess: (data) => {
      if (data.blocked) {
        toast.success('Usuario bloqueado — no verás su perfil ni Capsules');
      } else {
        toast.success('Usuario desbloqueado');
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public', username] });
      void queryClient.invalidateQueries({ queryKey: BLOCKED_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'discover'] });
      void queryClient.invalidateQueries({ queryKey: ['collections', 'discover'] });
    },
  });
}
