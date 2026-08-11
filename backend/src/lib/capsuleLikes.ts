import type { SupabaseClient } from '@supabase/supabase-js';
import { followRelationFlags, isMissingFollowsTable, loadFollowRelationSets } from './userFollows.js';

export interface LikeStats {
  likes_count: number;
  liked_by_me: boolean;
}

export interface LikerProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followed_by_me: boolean;
  follows_me: boolean;
}

export interface CapsuleLikeRow {
  user_id: string;
  created_at: string;
  profile: LikerProfile | null;
}

export interface CapsuleLikesPage {
  likes: CapsuleLikeRow[];
  total: number;
}

export function isMissingLikesTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('capsule_likes') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find')
  );
}

function defaultLikeStats<T extends { id: string }>(items: T[]): Array<T & LikeStats> {
  return items.map((item) => ({
    ...item,
    likes_count: 0,
    liked_by_me: false,
  }));
}

export async function attachLikeStats<T extends { id: string }>(
  supabase: SupabaseClient,
  userId: string,
  items: T[],
): Promise<Array<T & LikeStats>> {
  const ids = items.map((item) => item.id);
  if (ids.length === 0) return [];

  const { data: likes, error } = await supabase
    .from('capsule_likes')
    .select('capsule_id, user_id')
    .in('capsule_id', ids);

  if (error) {
    if (isMissingLikesTable(error)) {
      return defaultLikeStats(items);
    }
    throw error;
  }

  const countMap = new Map<string, number>();
  const likedByMe = new Set<string>();

  for (const like of likes ?? []) {
    countMap.set(like.capsule_id, (countMap.get(like.capsule_id) ?? 0) + 1);
    if (like.user_id === userId) {
      likedByMe.add(like.capsule_id);
    }
  }

  return items.map((item) => ({
    ...item,
    likes_count: countMap.get(item.id) ?? 0,
    liked_by_me: likedByMe.has(item.id),
  }));
}

/** Likes de una Capsule con perfil y followed_by_me del viewer (si aplica). */
export async function fetchLikesWithProfiles(
  supabase: SupabaseClient,
  capsuleId: string,
  options: { limit: number; offset: number; viewerId?: string },
): Promise<CapsuleLikesPage> {
  const { limit, offset, viewerId = '' } = options;

  const { data: rows, error, count } = await supabase
    .from('capsule_likes')
    .select('user_id, created_at', { count: 'exact' })
    .eq('capsule_id', capsuleId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const likeRows = rows ?? [];
  const userIds = likeRows.map((row) => row.user_id);
  const total = count ?? likeRows.length;

  if (userIds.length === 0) {
    return { likes: [], total };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) {
    throw profilesError;
  }

  const profileMap = new Map<
    string,
    { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
  >();
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, {
      id: profile.id,
      username: profile.username,
      display_name: profile.full_name ?? null,
      avatar_url: profile.avatar_url,
    });
  }

  let followedSet = new Set<string>();
  let followerSet = new Set<string>();
  if (viewerId) {
    try {
      const relations = await loadFollowRelationSets(supabase, viewerId, userIds);
      followedSet = relations.followedSet;
      followerSet = relations.followerSet;
    } catch (err) {
      if (!isMissingFollowsTable(err)) throw err;
    }
  }

  return {
    likes: likeRows.map((row) => {
      const base = profileMap.get(row.user_id) ?? null;
      return {
        user_id: row.user_id,
        created_at: row.created_at,
        profile: base
          ? {
              ...base,
              ...followRelationFlags(base.id, viewerId, followedSet, followerSet),
            }
          : null,
      };
    }),
    total,
  };
}
