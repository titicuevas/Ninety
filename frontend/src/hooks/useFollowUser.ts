import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { FeedResponse } from '@/types/capsule';
import type { Profile } from '@/types/profile';

interface PublicProfileData {
  profile: Profile;
  capsules: unknown[];
}

function updateProfileFollow(
  profile: Profile,
  followed: boolean,
): Profile {
  const delta = followed ? -1 : 1;
  return {
    ...profile,
    followed_by_me: !followed,
    followers_count: Math.max(0, (profile.followers_count ?? 0) + delta),
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

      const previousProfile = queryClient.getQueryData<PublicProfileData>(['profile', 'public', username]);
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed']);

      queryClient.setQueryData<PublicProfileData>(['profile', 'public', username], (old) =>
        old ? { ...old, profile: updateProfileFollow(old.profile, followed) } : old,
      );

      queryClient.setQueryData<InfiniteData<FeedResponse>>(['capsules', 'feed'], (old) =>
        bumpFeedFollowingCount(old, followed ? -1 : 1),
      );

      return { previousProfile, previousFeed };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile', 'public', username], context.previousProfile);
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(['capsules', 'feed'], context.previousFeed);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public', username] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'followers'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'following'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'search'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'discover'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
    },
  });
}
