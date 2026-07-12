import type { SupabaseClient } from '@supabase/supabase-js';

export interface FollowStats {
  followers_count: number;
  following_count: number;
  followed_by_me: boolean;
}

export function isMissingFollowsTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('user_follows') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find')
  );
}

function defaultFollowStats(): FollowStats {
  return {
    followers_count: 0,
    following_count: 0,
    followed_by_me: false,
  };
}

/** IDs de usuarios que sigue el viewer. `null` si la tabla no existe (sin filtrar feed). */
export async function getFollowingIds(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', viewerId);

  if (error) {
    if (isMissingFollowsTable(error)) return null;
    throw error;
  }

  return (data ?? []).map((row) => row.following_id);
}

export async function attachFollowStats<T extends { id: string }>(
  supabase: SupabaseClient,
  viewerId: string,
  profile: T,
): Promise<T & FollowStats> {
  const profileId = profile.id;

  const [followersResult, followingResult, followCheck] = await Promise.all([
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileId),
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileId),
    viewerId && viewerId !== profileId
      ? supabase
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', viewerId)
          .eq('following_id', profileId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const firstError = followersResult.error ?? followingResult.error ?? followCheck.error;
  if (firstError) {
    if (isMissingFollowsTable(firstError)) {
      return { ...profile, ...defaultFollowStats() };
    }
    throw firstError;
  }

  return {
    ...profile,
    followers_count: followersResult.count ?? 0,
    following_count: followingResult.count ?? 0,
    followed_by_me: !!viewerId && viewerId !== profileId && !!followCheck.data,
  };
}
