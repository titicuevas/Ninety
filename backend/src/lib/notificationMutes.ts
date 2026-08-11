import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeProfile, type ProfileRow } from './profileNormalize.js';
import { normalizeUsernameParam } from './usernameParam.js';

export type MutedProfile = ReturnType<typeof normalizeProfile> & {
  muted_at: string;
};

export function isMissingMutesTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return (
    message.includes('notification_mutes') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find') ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '42P01')
  );
}

/** true si el receptor tiene silenciado al actor. Sin tabla / error → fail-open (false). */
export async function isActorMuted(userId: string, actorId: string): Promise<boolean> {
  if (!userId || !actorId || userId === actorId) return false;

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return false;

  const { data, error } = await supabaseAdmin
    .from('notification_mutes')
    .select('muted_user_id')
    .eq('user_id', userId)
    .eq('muted_user_id', actorId)
    .maybeSingle();

  if (error) {
    if (isMissingMutesTable(error)) return false;
    return false;
  }

  return !!data;
}

export async function attachMutedByMe<T extends { id: string }>(
  supabase: SupabaseClient,
  viewerId: string,
  profile: T,
): Promise<T & { muted_by_me: boolean }> {
  if (!viewerId || viewerId === profile.id) {
    return { ...profile, muted_by_me: false };
  }

  const { data, error } = await supabase
    .from('notification_mutes')
    .select('muted_user_id')
    .eq('user_id', viewerId)
    .eq('muted_user_id', profile.id)
    .maybeSingle();

  if (error) {
    if (isMissingMutesTable(error)) {
      return { ...profile, muted_by_me: false };
    }
    throw error;
  }

  return { ...profile, muted_by_me: !!data };
}

export async function resolveMuteTargetByUsername(
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

export async function listMutedProfiles(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ profiles: MutedProfile[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return { profiles: [], total: 0 };

  const { data: edges, error, count } = await supabaseAdmin
    .from('notification_mutes')
    .select('muted_user_id, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isMissingMutesTable(error)) return { profiles: [], total: 0 };
    throw error;
  }

  const rows = edges ?? [];
  if (rows.length === 0) {
    return { profiles: [], total: count ?? 0 };
  }

  const ids = rows.map((row) => row.muted_user_id as string);
  const mutedAtById = new Map(
    rows.map((row) => [row.muted_user_id as string, row.created_at as string]),
  );

  const { data: profileRows, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name, avatar_url, favorite_team, country, city, bio, created_at')
    .in('id', ids)
    .not('username', 'is', null);

  if (profilesError) throw profilesError;

  const byId = new Map((profileRows ?? []).map((row) => [row.id, row as ProfileRow]));

  const profiles = ids
    .map((id) => {
      const row = byId.get(id);
      if (!row?.username) return null;
      return {
        ...normalizeProfile(row),
        muted_at: mutedAtById.get(id) ?? new Date(0).toISOString(),
      };
    })
    .filter((p): p is MutedProfile => !!p);

  return { profiles, total: count ?? profiles.length };
}

export async function muteUserById(
  userId: string,
  mutedUserId: string,
): Promise<{ muted: true }> {
  if (userId === mutedUserId) {
    throw Object.assign(new Error('No puedes silenciarte a ti mismo'), { status: 400 });
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Silenciados no disponibles'), { status: 503 });
  }

  const { error } = await supabaseAdmin.from('notification_mutes').insert({
    user_id: userId,
    muted_user_id: mutedUserId,
  });

  if (error) {
    if (isMissingMutesTable(error)) {
      throw Object.assign(
        new Error('Ejecuta la migración notification_mutes en Supabase.'),
        { status: 503 },
      );
    }
    if (error.code === '23505') {
      throw Object.assign(new Error('Ya tienes silenciado a este usuario'), { status: 409 });
    }
    throw error;
  }

  return { muted: true };
}

export async function unmuteUserById(
  userId: string,
  mutedUserId: string,
): Promise<{ muted: false }> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Silenciados no disponibles'), { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('notification_mutes')
    .delete()
    .eq('user_id', userId)
    .eq('muted_user_id', mutedUserId)
    .select('muted_user_id');

  if (error) {
    if (isMissingMutesTable(error)) {
      throw Object.assign(
        new Error('Ejecuta la migración notification_mutes en Supabase.'),
        { status: 503 },
      );
    }
    throw error;
  }

  if (!data?.length) {
    throw Object.assign(new Error('No tenías silenciado a este usuario'), { status: 404 });
  }

  return { muted: false };
}
