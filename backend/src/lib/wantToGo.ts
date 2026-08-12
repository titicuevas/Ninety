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
