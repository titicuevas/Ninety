import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { markPushPromptEligible } from '@/lib/pushPromptMemory';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type { FeedResponse } from '@/types/capsule';
import type { Profile } from '@/types/profile';
import type { AppNotification } from '@/hooks/useNotifications';

interface PublicProfilePage {
  profile: Profile;
  capsules: unknown[];
  total: number;
}

type PublicProfileInfinite = InfiniteData<PublicProfilePage>;

type ProfilesListResponse = {
  profiles: Profile[];
};

interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
  total: number;
  type?: string | null;
}

function updateProfileFollow(profile: Profile, followed: boolean): Profile {
  const delta = followed ? -1 : 1;
  return {
    ...profile,
    followed_by_me: !followed,
    followers_count: Math.max(0, (profile.followers_count ?? 0) + delta),
  };
}

function patchProfilesList(
  old: ProfilesListResponse | undefined,
  username: string,
  followed: boolean,
): ProfilesListResponse | undefined {
  if (!old) return old;
  return {
    ...old,
    profiles: old.profiles.map((profile) =>
      profile.username === username ? updateProfileFollow(profile, followed) : profile,
    ),
  };
}

function bumpFeedFollowingCount(
  old: InfiniteData<FeedResponse> | undefined,
  delta: number,
): InfiniteData<FeedResponse> | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page, index) =>
      index === 0
        ? { ...page, following_count: Math.max(0, (page.following_count ?? 0) + delta) }
        : page,
    ),
  };
}

function patchNotificationActors(
  old: InfiniteData<NotificationsResponse> | undefined,
  username: string,
  followed: boolean,
): InfiniteData<NotificationsResponse> | undefined {
  if (!old) return old;
  const nextFollowed = !followed;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      notifications: page.notifications.map((n) =>
        n.actor?.username === username
          ? { ...n, actor: { ...n.actor, followed_by_me: nextFollowed } }
          : n,
      ),
    })),
  };
}

export function useToggleFollow(username: string) {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ followed }: { followed: boolean }) => {
      const path = `/api/profile/${encodeURIComponent(username)}/follow`;
      if (followed) {
        await apiFetch<{ followed: boolean }>(path, { method: 'DELETE' }, session?.access_token);
        return;
      }
      await apiFetch<{ followed: boolean }>(path, { method: 'POST' }, session?.access_token);
    },
    onMutate: async ({ followed }) => {
      await queryClient.cancelQueries({ queryKey: ['profile', 'public', username] });
      await queryClient.cancelQueries({ queryKey: ['capsules', 'feed'] });
      await queryClient.cancelQueries({ queryKey: ['profile', 'search'] });
      await queryClient.cancelQueries({ queryKey: ['profile', 'discover'] });
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousProfiles = queryClient.getQueriesData<PublicProfileInfinite>({
        queryKey: ['profile', 'public', username],
      });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed']);
      const previousSearch = queryClient.getQueriesData<ProfilesListResponse>({
        queryKey: ['profile', 'search'],
      });
      const previousDiscover = queryClient.getQueriesData<ProfilesListResponse>({
        queryKey: ['profile', 'discover'],
      });
      const previousNotifications = queryClient.getQueriesData<InfiniteData<NotificationsResponse>>({
        queryKey: ['notifications'],
      });

      queryClient.setQueriesData<PublicProfileInfinite>(
        { queryKey: ['profile', 'public', username] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  profile: updateProfileFollow(page.profile, followed),
                })),
              }
            : old,
      );

      queryClient.setQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed'], (old) =>
        bumpFeedFollowingCount(old, followed ? -1 : 1),
      );

      queryClient.setQueriesData<ProfilesListResponse>({ queryKey: ['profile', 'search'] }, (old) =>
        patchProfilesList(old, username, followed),
      );

      queryClient.setQueriesData<ProfilesListResponse>({ queryKey: ['profile', 'discover'] }, (old) =>
        patchProfilesList(old, username, followed),
      );

      queryClient.setQueriesData<InfiniteData<NotificationsResponse>>(
        { queryKey: ['notifications'] },
        (old) => patchNotificationActors(old, username, followed),
      );

      return {
        previousProfiles,
        previousFeed,
        previousSearch,
        previousDiscover,
        previousNotifications,
      };
    },
    onError: (_err, _vars, context) => {
      context?.previousProfiles?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousFeed) {
        queryClient.setQueryData(['capsules', 'feed'], context.previousFeed);
      }
      context?.previousSearch?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      context?.previousDiscover?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      context?.previousNotifications?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('No se pudo actualizar el seguimiento');
    },
    onSuccess: (_data, { followed }) => {
      // Feedback en el botón (Seguir ↔ Dejar de seguir); sin toast de éxito.
      if (!followed && session?.user?.id) {
        markPushPromptEligible(session.user.id, 'first_follow');
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public', username] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'followers'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'following'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'search'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'discover'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'public'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
