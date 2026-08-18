import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid } from './postgrestSafe.js';
import { fetchProfilesByIds } from './profileLookup.js';
import { normalizeProfile, type ProfileRow } from './profileNormalize.js';
import { normalizeUsernameParam } from './usernameParam.js';

export type BlockedProfile = ReturnType<typeof normalizeProfile> & {
  blocked_at: string;
};

export type BlockRelation = {
  blocked_by_me: boolean;
  blocked_me: boolean;
};

export function isMissingBlocksTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('user_blocks') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find') ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '42P01')
  );
}

/** true si hay bloqueo en cualquier dirección. */
export function isBlockActive(relation: BlockRelation): boolean {
  return relation.blocked_by_me || relation.blocked_me;
}

/** Filtra IDs que están en el set de bloqueados (útil en feed/discover). */
export function excludeBlockedIds(ids: string[], blockedIds: ReadonlySet<string>): string[] {
  if (blockedIds.size === 0) return ids;
  return ids.filter((id) => !blockedIds.has(id));
}

export async function resolveBlockTargetByUsername(
  username: string,
): Promise<{ id: string; username: string } | null> {
  const normalized = normalizeUsernameParam(username);
  if (!normalized) return null;

  const { supabaseAdmin, supabaseAnon } = await import('./supabase.js');
  const client = supabaseAdmin ?? supabaseAnon;
  if (!client) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, username')
    .eq('username', normalized)
    .maybeSingle();

  if (error || !data?.id || !data.username) return null;
  return { id: data.id, username: data.username };
}

/**
 * Relación de bloqueo entre viewer y otro usuario.
 * Sin tabla / error → fail-open (sin bloqueo).
 */
export async function getBlockRelation(
  viewerId: string,
  otherId: string,
): Promise<BlockRelation> {
  if (!viewerId || !otherId || viewerId === otherId || !isUuid(viewerId) || !isUuid(otherId)) {
    return { blocked_by_me: false, blocked_me: false };
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    return { blocked_by_me: false, blocked_me: false };
  }

  const { data, error } = await supabaseAdmin
    .from('user_blocks')
    .select('user_id, blocked_user_id')
    .or(
      `and(user_id.eq.${viewerId},blocked_user_id.eq.${otherId}),and(user_id.eq.${otherId},blocked_user_id.eq.${viewerId})`,
    );

  if (error) {
    if (isMissingBlocksTable(error)) {
      return { blocked_by_me: false, blocked_me: false };
    }
    return { blocked_by_me: false, blocked_me: false };
  }

  let blocked_by_me = false;
  let blocked_me = false;
  for (const row of data ?? []) {
    if (row.user_id === viewerId && row.blocked_user_id === otherId) blocked_by_me = true;
    if (row.user_id === otherId && row.blocked_user_id === viewerId) blocked_me = true;
  }

  return { blocked_by_me, blocked_me };
}

/** IDs con los que el viewer tiene bloqueo en cualquier dirección. Fail-open → []. */
export async function listBlockedEitherWayIds(viewerId: string): Promise<string[]> {
  if (!viewerId || !isUuid(viewerId)) return [];

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('user_blocks')
    .select('user_id, blocked_user_id')
    .or(`user_id.eq.${viewerId},blocked_user_id.eq.${viewerId}`);

  if (error) {
    if (isMissingBlocksTable(error)) return [];
    return [];
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.user_id === viewerId) ids.add(row.blocked_user_id as string);
    else if (row.blocked_user_id === viewerId) ids.add(row.user_id as string);
  }
  return [...ids];
}

export async function attachBlockedByMe<T extends { id: string }>(
  supabase: SupabaseClient,
  viewerId: string,
  profile: T,
): Promise<T & { blocked_by_me: boolean }> {
  if (!viewerId || viewerId === profile.id) {
    return { ...profile, blocked_by_me: false };
  }

  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_user_id')
    .eq('user_id', viewerId)
    .eq('blocked_user_id', profile.id)
    .maybeSingle();

  if (error) {
    if (isMissingBlocksTable(error)) {
      return { ...profile, blocked_by_me: false };
    }
    throw error;
  }

  return { ...profile, blocked_by_me: !!data };
}

export async function listBlockedProfiles(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ profiles: BlockedProfile[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return { profiles: [], total: 0 };

  const { data: edges, error, count } = await supabaseAdmin
    .from('user_blocks')
    .select('blocked_user_id, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isMissingBlocksTable(error)) return { profiles: [], total: 0 };
    throw error;
  }

  const rows = edges ?? [];
  if (rows.length === 0) {
    return { profiles: [], total: count ?? 0 };
  }

  const ids = rows.map((row) => row.blocked_user_id as string);
  const blockedAtById = new Map(
    rows.map((row) => [row.blocked_user_id as string, row.created_at as string]),
  );

  const profilesResult = await fetchProfilesByIds(supabaseAdmin, ids);
  if (profilesResult.error) throw profilesResult.error;

  const byId = new Map(profilesResult.rows.map((row) => [row.id, row as ProfileRow]));

  const profiles = ids
    .map((id) => {
      const row = byId.get(id);
      if (!row?.username) return null;
      return {
        ...normalizeProfile(row),
        blocked_at: blockedAtById.get(id) ?? new Date(0).toISOString(),
      };
    })
    .filter((p): p is BlockedProfile => !!p);

  return { profiles, total: count ?? profiles.length };
}

async function removeFollowsBothWays(userId: string, otherId: string): Promise<void> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return;

  await Promise.all([
    supabaseAdmin
      .from('user_follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', otherId),
    supabaseAdmin
      .from('user_follows')
      .delete()
      .eq('follower_id', otherId)
      .eq('following_id', userId),
  ]);
}

export async function blockUserById(
  userId: string,
  blockedUserId: string,
): Promise<{ blocked: true }> {
  if (userId === blockedUserId) {
    throw Object.assign(new Error('No puedes bloquearte a ti mismo'), { status: 400 });
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Bloqueos no disponibles'), { status: 503 });
  }

  const { error } = await supabaseAdmin.from('user_blocks').insert({
    user_id: userId,
    blocked_user_id: blockedUserId,
  });

  if (error) {
    if (isMissingBlocksTable(error)) {
      throw Object.assign(new Error('Ejecuta la migración user_blocks en Supabase.'), {
        status: 503,
      });
    }
    if (error.code === '23505') {
      throw Object.assign(new Error('Ya tienes bloqueado a este usuario'), { status: 409 });
    }
    throw error;
  }

  await removeFollowsBothWays(userId, blockedUserId);
  return { blocked: true };
}

export async function unblockUserById(
  userId: string,
  blockedUserId: string,
): Promise<{ blocked: false }> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Bloqueos no disponibles'), { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('user_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('blocked_user_id', blockedUserId)
    .select('blocked_user_id');

  if (error) {
    if (isMissingBlocksTable(error)) {
      throw Object.assign(new Error('Ejecuta la migración user_blocks en Supabase.'), {
        status: 503,
      });
    }
    throw error;
  }

  if (!data?.length) {
    throw Object.assign(new Error('No tenías bloqueado a este usuario'), { status: 404 });
  }

  return { blocked: false };
}
