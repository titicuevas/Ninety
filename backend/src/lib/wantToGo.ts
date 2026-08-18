import { isValidCapsuleMatchId } from './manualMatch.js';

export type WantToGoMatchRow = {
  user_id: string;
  match_id: number;
  match_played_at: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_crest: string | null;
  away_team_crest: string | null;
  competition_name: string | null;
  home_score: number | null;
  away_score: number | null;
  note: string | null;
  created_at: string;
};

/** Payload público: sin nota ni user_id. */
export type PublicWantToGoItem = {
  match_id: number;
  match_played_at: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_crest: string | null;
  away_team_crest: string | null;
  competition_name: string | null;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
};

const PUBLIC_WANT_TO_GO_SELECT =
  'match_id, match_played_at, home_team_name, away_team_name, home_team_crest, away_team_crest, competition_name, home_score, away_score, created_at';

export type WantToGoMatchInput = {
  match_id: number;
  match_played_at?: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_crest?: string | null;
  away_team_crest?: string | null;
  competition_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  note?: string | null;
};

const TEAM_NAME_MAX = 80;
const COMPETITION_MAX = 80;
const NOTE_MAX = 500;
const CREST_MAX = 500;

export function isMissingWantToGoTable(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (!err) return false;
  if (err.code === '42P01') return true;
  const message = (err.message ?? '').toLowerCase();
  return (
    message.includes('want_to_go_matches') ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

export function normalizeTeamName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, TEAM_NAME_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalText(value: unknown, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalScore(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 99) return null;
  return n;
}

export function normalizeMatchPlayedAt(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/** Kickoff en el pasado. Sin fecha o inválida → aún no se considera jugado. */
export function isWantToGoMatchPlayed(
  matchPlayedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (matchPlayedAt == null || matchPlayedAt === '') return false;
  const kickoffMs = Date.parse(matchPlayedAt);
  if (Number.isNaN(kickoffMs)) return false;
  return kickoffMs < now.getTime();
}

function kickoffMs(playedAt: string | null): number | null {
  if (!playedAt) return null;
  const ms = Date.parse(playedAt);
  return Number.isNaN(ms) ? null : ms;
}

/** Próximos primero (fecha ascendente; sin fecha al final). */
export function selectUpcomingWantToGo<T extends { match_played_at: string | null }>(
  items: T[],
  now: Date = new Date(),
): T[] {
  return items
    .filter((item) => !isWantToGoMatchPlayed(item.match_played_at, now))
    .sort((a, b) => {
      const am = kickoffMs(a.match_played_at);
      const bm = kickoffMs(b.match_played_at);
      if (am == null && bm == null) return 0;
      if (am == null) return 1;
      if (bm == null) return -1;
      return am - bm;
    });
}

export function toPublicWantToGoItem(
  row: PublicWantToGoItem & { note?: string | null; user_id?: string },
): PublicWantToGoItem {
  return {
    match_id: row.match_id,
    match_played_at: row.match_played_at,
    home_team_name: row.home_team_name,
    away_team_name: row.away_team_name,
    home_team_crest: row.home_team_crest,
    away_team_crest: row.away_team_crest,
    competition_name: row.competition_name,
    home_score: row.home_score,
    away_score: row.away_score,
    created_at: row.created_at,
  };
}

/** Ya jugados y sin Capsule (para limpiar la watchlist). */
export function matchIdsToClearPlayedWithoutCapsule(
  items: Array<{ match_id: number; match_played_at: string | null }>,
  capsuleMatchIds: ReadonlySet<number>,
  now: Date = new Date(),
): number[] {
  return items
    .filter(
      (item) =>
        isWantToGoMatchPlayed(item.match_played_at, now) && !capsuleMatchIds.has(item.match_id),
    )
    .map((item) => item.match_id);
}

export function sanitizeWantToGoInput(raw: WantToGoMatchInput): WantToGoMatchInput | null {
  if (!isValidCapsuleMatchId(raw.match_id)) return null;

  const home = normalizeTeamName(raw.home_team_name);
  const away = normalizeTeamName(raw.away_team_name);
  if (!home || !away) return null;
  if (home.toLocaleLowerCase('es') === away.toLocaleLowerCase('es')) return null;

  return {
    match_id: raw.match_id,
    match_played_at: normalizeMatchPlayedAt(raw.match_played_at),
    home_team_name: home,
    away_team_name: away,
    home_team_crest: normalizeOptionalText(raw.home_team_crest, CREST_MAX),
    away_team_crest: normalizeOptionalText(raw.away_team_crest, CREST_MAX),
    competition_name: normalizeOptionalText(raw.competition_name, COMPETITION_MAX),
    home_score: normalizeOptionalScore(raw.home_score),
    away_score: normalizeOptionalScore(raw.away_score),
    note: normalizeOptionalText(raw.note, NOTE_MAX),
  };
}

export async function listWantToGoMatches(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ items: WantToGoMatchRow[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Quiero ir no disponible'), { status: 503 });
  }

  const { data, error, count } = await supabaseAdmin
    .from('want_to_go_matches')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isMissingWantToGoTable(error)) {
      throw Object.assign(new Error('Quiero ir no disponible (aplica la migración)'), {
        status: 503,
      });
    }
    throw error;
  }

  return {
    items: (data ?? []) as WantToGoMatchRow[],
    total: count ?? 0,
  };
}

export async function listPublicWantToGoMatches(
  userId: string,
  options: { limit?: number } = {},
): Promise<{ items: PublicWantToGoItem[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 50);

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Quiero ir no disponible'), { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('want_to_go_matches')
    .select(PUBLIC_WANT_TO_GO_SELECT)
    .eq('user_id', userId)
    .limit(500);

  if (error) {
    if (isMissingWantToGoTable(error)) {
      throw Object.assign(new Error('Quiero ir no disponible (aplica la migración)'), {
        status: 503,
      });
    }
    throw error;
  }

  const upcoming = selectUpcomingWantToGo((data ?? []) as PublicWantToGoItem[]);
  return {
    items: upcoming.slice(0, limit).map(toPublicWantToGoItem),
    total: upcoming.length,
  };
}

export async function listWantToGoMatchIds(userId: string): Promise<number[]> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Quiero ir no disponible'), { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('want_to_go_matches')
    .select('match_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    if (isMissingWantToGoTable(error)) {
      throw Object.assign(new Error('Quiero ir no disponible (aplica la migración)'), {
        status: 503,
      });
    }
    throw error;
  }

  return (data ?? []).map((row) => row.match_id as number);
}

export type WantToGoInCommonProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

/** Follows del usuario que también tienen el partido en Quiero ir. */
export async function listWantToGoInCommon(
  userId: string,
  matchId: number,
): Promise<WantToGoInCommonProfile[]> {
  if (!isValidCapsuleMatchId(matchId)) {
    throw Object.assign(new Error('match_id inválido'), { status: 400 });
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Quiero ir no disponible'), { status: 503 });
  }

  const { data: followingRows, error: followingError } = await supabaseAdmin
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId)
    .limit(500);

  if (followingError) {
    if (
      (followingError.message ?? '').includes('user_follows') ||
      followingError.code === '42P01'
    ) {
      return [];
    }
    throw followingError;
  }

  const followingIds = (followingRows ?? []).map((row) => row.following_id as string);
  if (followingIds.length === 0) return [];

  const { data: shared, error: sharedError } = await supabaseAdmin
    .from('want_to_go_matches')
    .select('user_id')
    .eq('match_id', matchId)
    .in('user_id', followingIds)
    .limit(50);

  if (sharedError) {
    if (isMissingWantToGoTable(sharedError)) {
      throw Object.assign(new Error('Quiero ir no disponible (aplica la migración)'), {
        status: 503,
      });
    }
    throw sharedError;
  }

  const sharedIds = [...new Set((shared ?? []).map((row) => row.user_id as string))];
  if (sharedIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', sharedIds);

  if (profilesError) throw profilesError;

  const byId = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        id: p.id as string,
        username: (p.username as string | null) ?? null,
        display_name: (p.full_name as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      },
    ]),
  );

  return sharedIds
    .map((id) => byId.get(id))
    .filter((p): p is WantToGoInCommonProfile => !!p)
    .sort((a, b) =>
      (a.display_name ?? a.username ?? '').localeCompare(b.display_name ?? b.username ?? '', 'es'),
    );
}

export async function addWantToGoMatch(
  userId: string,
  input: WantToGoMatchInput,
): Promise<WantToGoMatchRow> {
  const sanitized = sanitizeWantToGoInput(input);
  if (!sanitized) {
    throw Object.assign(new Error('Datos de partido inválidos'), { status: 400 });
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Quiero ir no disponible'), { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('want_to_go_matches')
    .upsert(
      {
        user_id: userId,
        match_id: sanitized.match_id,
        match_played_at: sanitized.match_played_at,
        home_team_name: sanitized.home_team_name,
        away_team_name: sanitized.away_team_name,
        home_team_crest: sanitized.home_team_crest,
        away_team_crest: sanitized.away_team_crest,
        competition_name: sanitized.competition_name,
        home_score: sanitized.home_score,
        away_score: sanitized.away_score,
        note: sanitized.note,
      },
      { onConflict: 'user_id,match_id', ignoreDuplicates: true },
    )
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingWantToGoTable(error)) {
      throw Object.assign(new Error('Quiero ir no disponible (aplica la migración)'), {
        status: 503,
      });
    }
    throw error;
  }

  if (data) return data as WantToGoMatchRow;

  // Ya existía (ignoreDuplicates): devolver fila actual.
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('want_to_go_matches')
    .select('*')
    .eq('user_id', userId)
    .eq('match_id', sanitized.match_id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) {
    throw Object.assign(new Error('No se pudo guardar en Quiero ir'), { status: 500 });
  }
  return existing as WantToGoMatchRow;
}

export async function removeWantToGoMatch(userId: string, matchId: number): Promise<boolean> {
  if (!isValidCapsuleMatchId(matchId)) {
    throw Object.assign(new Error('match_id inválido'), { status: 400 });
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Quiero ir no disponible'), { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('want_to_go_matches')
    .delete()
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .select('match_id')
    .maybeSingle();

  if (error) {
    if (isMissingWantToGoTable(error)) {
      throw Object.assign(new Error('Quiero ir no disponible (aplica la migración)'), {
        status: 503,
      });
    }
    throw error;
  }

  return !!data;
}

/** Quita de Quiero ir los partidos ya jugados sin Capsule. */
export async function clearPlayedWantToGoWithoutCapsule(
  userId: string,
  now: Date = new Date(),
): Promise<{ removed: number }> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Quiero ir no disponible'), { status: 503 });
  }

  const { data: rows, error } = await supabaseAdmin
    .from('want_to_go_matches')
    .select('match_id, match_played_at')
    .eq('user_id', userId)
    .limit(500);

  if (error) {
    if (isMissingWantToGoTable(error)) {
      throw Object.assign(new Error('Quiero ir no disponible (aplica la migración)'), {
        status: 503,
      });
    }
    throw error;
  }

  const items = (rows ?? []) as Array<{ match_id: number; match_played_at: string | null }>;
  if (items.length === 0) return { removed: 0 };

  const { data: capsuleRows, error: capsulesError } = await supabaseAdmin
    .from('capsules')
    .select('match_id')
    .eq('user_id', userId);

  if (capsulesError) throw capsulesError;

  const saved = new Set(
    (capsuleRows ?? [])
      .map((row) => Number(row.match_id))
      .filter((id) => Number.isFinite(id)),
  );
  const toRemove = matchIdsToClearPlayedWithoutCapsule(items, saved, now);
  if (toRemove.length === 0) return { removed: 0 };

  const { data: deleted, error: deleteError } = await supabaseAdmin
    .from('want_to_go_matches')
    .delete()
    .eq('user_id', userId)
    .in('match_id', toRemove)
    .select('match_id');

  if (deleteError) {
    if (isMissingWantToGoTable(deleteError)) {
      throw Object.assign(new Error('Quiero ir no disponible (aplica la migración)'), {
        status: 503,
      });
    }
    throw deleteError;
  }

  return { removed: deleted?.length ?? toRemove.length };
}

/**
 * Tras crear una Capsule: quita el partido de Quiero ir si estaba.
 * Best-effort — nunca debe fallar el create.
 */
export async function clearWantToGoAfterCapsule(
  userId: string,
  matchId: number,
): Promise<boolean> {
  if (!userId || !isValidCapsuleMatchId(matchId)) return false;
  try {
    return await removeWantToGoMatch(userId, matchId);
  } catch {
    return false;
  }
}
