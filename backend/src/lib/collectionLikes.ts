import type { SupabaseClient } from '@supabase/supabase-js';
import { followRelationFlags, isMissingFollowsTable, loadFollowRelationSets } from './userFollows.js';

export interface CollectionLikeStats {
  likes_count: number;
  liked_by_me: boolean;
}

export interface CollectionLikerProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followed_by_me: boolean;
  follows_me: boolean;
}

export interface CollectionLikeRow {
  user_id: string;
  created_at: string;
  profile: CollectionLikerProfile | null;
}

export interface CollectionLikesPage {
  likes: CollectionLikeRow[];
  total: number;
}

export function isMissingCollectionLikesTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('collection_likes') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find')
  );
}

export function collectionLikesMigrationHint(): string {
  return 'Ejecuta la migración 20250821120000_collection_likes.sql en Supabase.';
}

function defaultLikeStats<T extends { id: string }>(items: T[]): Array<T & CollectionLikeStats> {
  return items.map((item) => ({
    ...item,
    likes_count: 0,
    liked_by_me: false,
  }));
}

/** Adjunta contador y liked_by_me a colecciones (viewer opcional). */
export async function attachCollectionLikeStats<T extends { id: string }>(
  supabase: SupabaseClient,
  viewerId: string,
  items: T[],
): Promise<Array<T & CollectionLikeStats>> {
  const ids = items.map((item) => item.id);
  if (ids.length === 0) return [];

  const { data: likes, error } = await supabase
    .from('collection_likes')
    .select('collection_id, user_id')
    .in('collection_id', ids);

  if (error) {
    if (isMissingCollectionLikesTable(error)) {
      return defaultLikeStats(items);
    }
    throw error;
  }

  const countMap = new Map<string, number>();
  const likedByMe = new Set<string>();

  for (const like of likes ?? []) {
    countMap.set(like.collection_id, (countMap.get(like.collection_id) ?? 0) + 1);
    if (viewerId && like.user_id === viewerId) {
      likedByMe.add(like.collection_id);
    }
  }

  return items.map((item) => ({
    ...item,
    likes_count: countMap.get(item.id) ?? 0,
    liked_by_me: likedByMe.has(item.id),
  }));
}

/** Likes de una colección con perfil y relación de follow del viewer. */
export async function fetchCollectionLikesWithProfiles(
  supabase: SupabaseClient,
  collectionId: string,
  options: { limit: number; offset: number; viewerId?: string },
): Promise<CollectionLikesPage> {
  const { limit, offset, viewerId = '' } = options;

  const { data: rows, error, count } = await supabase
    .from('collection_likes')
    .select('user_id, created_at', { count: 'exact' })
    .eq('collection_id', collectionId)
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

/** ¿Puede el viewer interactuar con likes de esta colección? */
export function canEngageCollectionLikes(
  collection: { user_id: string; is_public: boolean },
  viewerId: string | undefined,
): boolean {
  if (collection.is_public) return true;
  return !!viewerId && viewerId === collection.user_id;
}
