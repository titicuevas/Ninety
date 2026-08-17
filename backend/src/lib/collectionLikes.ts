import type { SupabaseClient } from '@supabase/supabase-js';
import { candidateAlsoWatchedIds } from './capsuleAlsoWatched.js';
import { fetchProfilesByIds } from './profileLookup.js';
import { listBlockedEitherWayIds } from './userBlocks.js';
import { followRelationFlags, getFollowingIds, isMissingFollowsTable, loadFollowRelationSets } from './userFollows.js';

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

export const LIKED_COLLECTIONS_LIMIT_MAX = 50;

export type LikedCollectionAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type LikedCollectionRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  cover_capsule_id: string | null;
  created_at: string;
  updated_at: string;
  liked_at: string;
  likes_count: number;
  liked_by_me: boolean;
  author: LikedCollectionAuthor | null;
};

export function likedCollectionsPaging(limit?: number, offset?: number): { limit: number; offset: number } {
  return {
    limit: Math.min(Math.max(limit ?? 20, 1), LIKED_COLLECTIONS_LIMIT_MAX),
    offset: Math.max(offset ?? 0, 0),
  };
}

/** Pública, o propia; oculta autores bloqueados. */
export function isVisibleLikedCollection(
  collection: { user_id: string; is_public: boolean },
  viewerId: string,
  blockedIds: ReadonlySet<string>,
): boolean {
  if (collection.user_id !== viewerId && blockedIds.has(collection.user_id)) return false;
  return canEngageCollectionLikes(collection, viewerId);
}

export function orderCollectionsByLikedIds<T extends { id: string }>(
  likedIds: string[],
  collections: T[],
): T[] {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  return likedIds.map((id) => byId.get(id)).filter((collection): collection is T => !!collection);
}

type LikedCollectionSource = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  cover_capsule_id?: string | null;
  created_at: string;
  updated_at: string;
};

/** Listas a las que el viewer dio me gusta, más recientes primero. */
export async function listLikedCollections(
  supabase: SupabaseClient,
  viewerId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ collections: LikedCollectionRow[]; total: number; limit: number; offset: number }> {
  const { limit, offset } = likedCollectionsPaging(options.limit, options.offset);

  const { data: likeRows, error: likesError, count } = await supabase
    .from('collection_likes')
    .select('collection_id, created_at', { count: 'exact' })
    .eq('user_id', viewerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (likesError) {
    if (isMissingCollectionLikesTable(likesError)) {
      throw Object.assign(new Error(collectionLikesMigrationHint()), { status: 503 });
    }
    throw likesError;
  }

  const likes = likeRows ?? [];
  const total = count ?? likes.length;
  if (likes.length === 0) {
    return { collections: [], total, limit, offset };
  }

  const likedAtById = new Map(likes.map((row) => [row.collection_id as string, row.created_at as string]));
  const likedIds = likes.map((row) => row.collection_id as string);

  const [{ data: collectionRows, error: collectionsError }, blockedList] = await Promise.all([
    supabase.from('collections').select('*').in('id', likedIds),
    listBlockedEitherWayIds(viewerId),
  ]);

  if (collectionsError) throw collectionsError;

  const blockedIds = new Set(blockedList);
  const visible = orderCollectionsByLikedIds(
    likedIds,
    (collectionRows ?? []) as LikedCollectionSource[],
  ).filter((collection) => isVisibleLikedCollection(collection, viewerId, blockedIds));

  if (visible.length === 0) {
    return { collections: [], total, limit, offset };
  }

  const userIds = [...new Set(visible.map((collection) => collection.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map<string, LikedCollectionAuthor>();
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id as string, {
      id: profile.id as string,
      username: (profile.username as string | null) ?? null,
      display_name: (profile.full_name as string | null) ?? null,
      avatar_url: (profile.avatar_url as string | null) ?? null,
    });
  }

  const withLikes = await attachCollectionLikeStats(supabase, viewerId, visible);

  return {
    collections: withLikes.map((collection) => ({
      id: collection.id,
      user_id: collection.user_id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      is_public: collection.is_public,
      cover_capsule_id: collection.cover_capsule_id ?? null,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      liked_at: likedAtById.get(collection.id) ?? '',
      likes_count: collection.likes_count,
      liked_by_me: collection.liked_by_me,
      author: profileMap.get(collection.user_id) ?? null,
    })),
    total,
    limit,
    offset,
  };
}

export const ALSO_LIKED_LIMIT = 50;

export type CollectionAlsoLikedPerson = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function assembleAlsoLikedPeople(
  userIds: string[],
  profiles: Array<{
    id: string;
    username: string | null;
    display_name?: string | null;
    full_name?: string | null;
    avatar_url: string | null;
  }>,
): CollectionAlsoLikedPerson[] {
  const byId = new Map(
    profiles.map((profile) => [
      profile.id,
      {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name ?? profile.full_name ?? null,
        avatar_url: profile.avatar_url,
      },
    ]),
  );

  const seen = new Set<string>();
  const people: CollectionAlsoLikedPerson[] = [];
  for (const id of userIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const profile = byId.get(id);
    if (!profile) continue;
    people.push(profile);
  }

  return people.sort((a, b) =>
    (a.display_name ?? a.username ?? '').localeCompare(b.display_name ?? b.username ?? '', 'es'),
  );
}

/** Follows del viewer que dieron me gusta a esta lista (sin el dueño ni bloqueados). */
export async function listCollectionAlsoLiked(
  viewerId: string,
  collectionId: string,
): Promise<CollectionAlsoLikedPerson[]> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Me gusta no disponibles'), { status: 503 });
  }

  const { data: collection, error: collectionError } = await supabaseAdmin
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', collectionId)
    .maybeSingle();

  if (collectionError) throw collectionError;
  if (!collection || !canEngageCollectionLikes(collection, viewerId)) {
    throw Object.assign(new Error('Colección no encontrada'), { status: 404 });
  }

  const [followingIds, blockedList] = await Promise.all([
    getFollowingIds(supabaseAdmin, viewerId),
    listBlockedEitherWayIds(viewerId),
  ]);

  const blockedIds = new Set(blockedList);
  if (collection.user_id !== viewerId && blockedIds.has(collection.user_id)) {
    throw Object.assign(new Error('Colección no encontrada'), { status: 404 });
  }

  const candidateIds = candidateAlsoWatchedIds(followingIds, blockedIds, viewerId).filter(
    (id) => id !== collection.user_id,
  );
  if (candidateIds.length === 0) return [];

  const { data: likes, error: likesError } = await supabaseAdmin
    .from('collection_likes')
    .select('user_id')
    .eq('collection_id', collectionId)
    .in('user_id', candidateIds)
    .limit(ALSO_LIKED_LIMIT);

  if (likesError) {
    if (isMissingCollectionLikesTable(likesError)) {
      throw Object.assign(new Error(collectionLikesMigrationHint()), { status: 503 });
    }
    throw likesError;
  }

  const userIds = [...new Set((likes ?? []).map((row) => row.user_id as string))];
  if (userIds.length === 0) return [];

  const profiles = await fetchProfilesByIds(supabaseAdmin, userIds);
  if (profiles.error) throw profiles.error;

  return assembleAlsoLikedPeople(userIds, profiles.rows);
}
