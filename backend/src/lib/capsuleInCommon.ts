import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidCapsuleMatchId } from './manualMatch.js';

/** Partidos que caben en el cara a cara. */
export const IN_COMMON_LIMIT = 12;
/** Tope de match_ids del viewer para el cruce (diarios enormes). */
export const IN_COMMON_MATCH_SCAN = 400;
const MATCH_ID_CHUNK = 80;

export type CapsuleMatchRow = {
  id: string;
  match_id: number | null;
  rating: number | null;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  watched_at: string | null;
  photo_urls: string[] | null;
};

export type InCommonMatch = {
  match_id: number;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  watched_at: string | null;
  photo_urls: string[] | null;
  me_capsule_id: string;
  me_rating: number | null;
  them_capsule_id: string;
  them_rating: number | null;
};

export function uniqueValidMatchIds(ids: Iterable<number | null | undefined>): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (typeof id !== 'number' || !isValidCapsuleMatchId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= IN_COMMON_MATCH_SCAN) break;
  }
  return out;
}

export function chunkMatchIds(ids: number[], size = MATCH_ID_CHUNK): number[][] {
  if (size <= 0) return [];
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

function rowMatchId(row: CapsuleMatchRow): number | null {
  return typeof row.match_id === 'number' && isValidCapsuleMatchId(row.match_id) ? row.match_id : null;
}

function watchedSortKey(value: string | null): string {
  return value ?? '';
}

/** Cruza Capsules propias con las públicas del otro por `match_id`. */
export function mergeCapsulesInCommon(
  mine: CapsuleMatchRow[],
  theirs: CapsuleMatchRow[],
  limit = IN_COMMON_LIMIT,
): { matches: InCommonMatch[]; total: number } {
  const mineByMatch = new Map<number, CapsuleMatchRow>();
  for (const row of mine) {
    const matchId = rowMatchId(row);
    if (matchId == null || mineByMatch.has(matchId)) continue;
    mineByMatch.set(matchId, row);
  }

  const merged: InCommonMatch[] = [];
  const seen = new Set<number>();
  for (const row of theirs) {
    const matchId = rowMatchId(row);
    if (matchId == null || seen.has(matchId)) continue;
    const mineRow = mineByMatch.get(matchId);
    if (!mineRow) continue;
    seen.add(matchId);
    merged.push({
      match_id: matchId,
      home_team_name: row.home_team_name,
      away_team_name: row.away_team_name,
      competition_name: row.competition_name,
      watched_at: row.watched_at ?? mineRow.watched_at,
      photo_urls: row.photo_urls,
      me_capsule_id: mineRow.id,
      me_rating: mineRow.rating,
      them_capsule_id: row.id,
      them_rating: row.rating,
    });
  }

  merged.sort((a, b) => watchedSortKey(b.watched_at).localeCompare(watchedSortKey(a.watched_at)));
  return {
    matches: merged.slice(0, Math.max(0, limit)),
    total: merged.length,
  };
}

const SELECT_MATCH_FIELDS =
  'id, match_id, rating, home_team_name, away_team_name, competition_name, watched_at, photo_urls';

/** Partidos que ambos habéis guardado (tú cualquier visibilidad; el otro, públicas). */
export async function loadCapsulesInCommon(
  supabase: SupabaseClient,
  viewerId: string,
  otherUserId: string,
): Promise<{ matches: InCommonMatch[]; total: number }> {
  if (!viewerId || !otherUserId || viewerId === otherUserId) {
    return { matches: [], total: 0 };
  }

  const { data: mineData, error: mineError } = await supabase
    .from('capsules')
    .select(SELECT_MATCH_FIELDS)
    .eq('user_id', viewerId)
    .not('match_id', 'is', null)
    .order('watched_at', { ascending: false })
    .limit(IN_COMMON_MATCH_SCAN);

  if (mineError) throw mineError;
  const mine = (mineData ?? []) as CapsuleMatchRow[];
  const matchIds = uniqueValidMatchIds(mine.map((row) => row.match_id));
  if (matchIds.length === 0) return { matches: [], total: 0 };

  const theirs: CapsuleMatchRow[] = [];
  for (const chunk of chunkMatchIds(matchIds)) {
    const { data, error } = await supabase
      .from('capsules')
      .select(SELECT_MATCH_FIELDS)
      .eq('user_id', otherUserId)
      .eq('is_public', true)
      .in('match_id', chunk);
    if (error) throw error;
    theirs.push(...((data ?? []) as CapsuleMatchRow[]));
  }

  return mergeCapsulesInCommon(mine, theirs);
}
