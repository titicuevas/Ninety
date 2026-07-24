import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeProfile, type ProfileRow } from './profileNormalize.js';

export interface FollowStats {
  followers_count: number;
  following_count: number;
  followed_by_me: boolean;
}

export type FollowListKind = 'followers' | 'following';

export interface FollowListResult {
  profiles: Array<ReturnType<typeof normalizeProfile> & { followed_by_me: boolean }>;
  total: number;
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

/** Lista de seguidores o seguidos, ordenada por fecha de follow (más reciente primero). */
export async function listFollowProfiles(
  supabase: SupabaseClient,
  profileId: string,
  kind: FollowListKind,
  options: { limit: number; offset: number; viewerId?: string },
): Promise<FollowListResult> {
  const { limit, offset, viewerId = '' } = options;
  const idColumn = kind === 'followers' ? 'follower_id' : 'following_id';
  const filterColumn = kind === 'followers' ? 'following_id' : 'follower_id';

  const { data: edges, error, count } = await supabase
    .from('user_follows')
    .select(idColumn, { count: 'exact' })
    .eq(filterColumn, profileId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isMissingFollowsTable(error)) {
      return { profiles: [], total: 0 };
    }
    throw error;
  }

  const ids = (edges ?? [])
    .map((row) => (row as Record<string, string>)[idColumn])
    .filter(Boolean);

  if (ids.length === 0) {
    return { profiles: [], total: count ?? 0 };
  }

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, favorite_team, country, city, created_at')
    .in('id', ids)
    .not('username', 'is', null);

  if (profilesError) throw profilesError;

  const byId = new Map((profileRows ?? []).map((row) => [row.id, row as ProfileRow]));

  let followedSet = new Set<string>();
  if (viewerId) {
    const { data: myFollows, error: myFollowsError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', ids);

    if (myFollowsError) {
      if (!isMissingFollowsTable(myFollowsError)) throw myFollowsError;
    } else {
      followedSet = new Set((myFollows ?? []).map((row) => row.following_id));
    }
  }

  const profiles = ids
    .map((id) => byId.get(id))
    .filter((row): row is ProfileRow => !!row?.username)
    .map((row) => ({
      ...normalizeProfile(row),
      followed_by_me: viewerId !== row.id && followedSet.has(row.id),
    }));

  return { profiles, total: count ?? profiles.length };
}
