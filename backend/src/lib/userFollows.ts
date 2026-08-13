import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeProfile, type ProfileRow } from './profileNormalize.js';

export interface FollowStats {
  followers_count: number;
  following_count: number;
  followed_by_me: boolean;
  /** true si el perfil sigue al viewer (mutual o «te sigue»). */
  follows_me: boolean;
}

export type FollowListKind = 'followers' | 'following';

export type FollowAnnotatedProfile = ReturnType<typeof normalizeProfile> & {
  followed_by_me: boolean;
  follows_me: boolean;
};

export interface FollowListResult {
  profiles: FollowAnnotatedProfile[];
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
    follows_me: false,
  };
}

/** Flags de relación viewer ↔ perfil (excluye self). */
export function followRelationFlags(
  profileId: string,
  viewerId: string,
  followedSet: Set<string>,
  followerSet: Set<string>,
): { followed_by_me: boolean; follows_me: boolean } {
  if (!viewerId || viewerId === profileId) {
    return { followed_by_me: false, follows_me: false };
  }
  return {
    followed_by_me: followedSet.has(profileId),
    follows_me: followerSet.has(profileId),
  };
}

/**
 * Carga sets bidireccionales: a quién sigue el viewer y quién de `profileIds` le sigue.
 * Sets vacíos si no hay viewer, ids o la tabla no existe.
 */
export async function loadFollowRelationSets(
  supabase: SupabaseClient,
  viewerId: string,
  profileIds: string[],
): Promise<{ followedSet: Set<string>; followerSet: Set<string> }> {
  const empty = { followedSet: new Set<string>(), followerSet: new Set<string>() };
  if (!viewerId || profileIds.length === 0) return empty;

  const [outgoing, incoming] = await Promise.all([
    supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', profileIds),
    supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', viewerId)
      .in('follower_id', profileIds),
  ]);

  if (outgoing.error) {
    if (isMissingFollowsTable(outgoing.error)) return empty;
    throw outgoing.error;
  }
  if (incoming.error) {
    if (isMissingFollowsTable(incoming.error)) return empty;
    throw incoming.error;
  }

  return {
    followedSet: new Set((outgoing.data ?? []).map((row) => row.following_id)),
    followerSet: new Set((incoming.data ?? []).map((row) => row.follower_id)),
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

  const [followersResult, followingResult, followCheck, followsMeCheck] = await Promise.all([
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
    viewerId && viewerId !== profileId
      ? supabase
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', profileId)
          .eq('following_id', viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const firstError =
    followersResult.error ?? followingResult.error ?? followCheck.error ?? followsMeCheck.error;
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
    follows_me: !!viewerId && viewerId !== profileId && !!followsMeCheck.data,
  };
}

export class FollowMutationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FollowMutationError';
    this.status = status;
  }
}

/**
 * Inserta follow con service role (auth ya validada en la ruta).
 * Evita falsos fallos de RLS con createUserClient + JWT.
 */
export async function followUserById(
  followerId: string,
  followingId: string,
): Promise<{ followed: true; already: boolean }> {
  if (followerId === followingId) {
    throw new FollowMutationError('No puedes seguirte a ti mismo', 400);
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw new FollowMutationError(
      'Función de seguir no disponible. Falta SUPABASE_SERVICE_ROLE_KEY.',
      503,
    );
  }

  const { error } = await supabaseAdmin.from('user_follows').insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error) {
    if (isMissingFollowsTable(error)) {
      throw new FollowMutationError(
        'Función de seguir no disponible. Ejecuta la migración user_follows.',
        503,
      );
    }
    if (error.code === '23505') {
      return { followed: true, already: true };
    }
    throw new FollowMutationError(error.message, 400);
  }

  return { followed: true, already: false };
}

/**
 * Borra follow con service role. Idempotente: si no había fila, success.
 */
export async function unfollowUserById(
  followerId: string,
  followingId: string,
): Promise<{ followed: false }> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw new FollowMutationError(
      'Función de seguir no disponible. Falta SUPABASE_SERVICE_ROLE_KEY.',
      503,
    );
  }

  const { error } = await supabaseAdmin
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    if (isMissingFollowsTable(error)) {
      throw new FollowMutationError(
        'Función de seguir no disponible. Ejecuta la migración user_follows.',
        503,
      );
    }
    throw new FollowMutationError(error.message, 400);
  }

  return { followed: false };
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
  const { followedSet, followerSet } = await loadFollowRelationSets(supabase, viewerId, ids);

  const profiles = ids
    .map((id) => byId.get(id))
    .filter((row): row is ProfileRow => !!row?.username)
    .map((row) => ({
      ...normalizeProfile(row),
      ...followRelationFlags(row.id, viewerId, followedSet, followerSet),
    }));

  return { profiles, total: count ?? profiles.length };
}
