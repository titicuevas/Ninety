import type { FootballMatch } from '@/types/football';

/** Ventana on-device: partidos en las próximas 48 h (paridad con push). */
export const WANT_TO_GO_NUDGE_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Ventana «ya jugó»: kickoff en el pasado hasta 14 días. */
const WANT_TO_GO_PLAYED_NUDGE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type WantToGoNudgeMatch = {
  match_id: number;
  home_team_name: string;
  away_team_name: string;
  match_played_at: string | null;
  competition_name?: string | null;
  home_team_crest?: string | null;
  away_team_crest?: string | null;
  home_score?: number | null;
  away_score?: number | null;
};

type WantToGoNudgeKind = 'upcoming' | 'played';

export type WantToGoNudge = {
  kind: WantToGoNudgeKind;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  matchPlayedAt: string;
  extraCount: number;
  href: string;
  title: string;
  body: string;
  hrefLabel: string;
  /** Solo kind=played: payload para `/capsules/new`. */
  createMatch?: FootballMatch;
};

/** Partido futuro dentro de la ventana (p. ej. 0–48 h). Sin fecha → no. */
export function isMatchInWantToGoNudgeWindow(
  matchPlayedAt: string | null | undefined,
  now: Date,
  windowMs: number = WANT_TO_GO_NUDGE_WINDOW_MS,
): boolean {
  if (matchPlayedAt == null || matchPlayedAt === '') return false;
  const kickoffMs = Date.parse(matchPlayedAt);
  if (Number.isNaN(kickoffMs)) return false;
  const delta = kickoffMs - now.getTime();
  return delta > 0 && delta <= windowMs;
}

/** Partido ya jugado dentro de la ventana retrospectiva. */
export function isMatchInWantToGoPlayedWindow(
  matchPlayedAt: string | null | undefined,
  now: Date,
  windowMs: number = WANT_TO_GO_PLAYED_NUDGE_WINDOW_MS,
): boolean {
  if (matchPlayedAt == null || matchPlayedAt === '') return false;
  const kickoffMs = Date.parse(matchPlayedAt);
  if (Number.isNaN(kickoffMs)) return false;
  const delta = now.getTime() - kickoffMs;
  return delta > 0 && delta <= windowMs;
}

function localDayKey(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

function formatRelativeKickoff(matchPlayedAt: string, now: Date): string {
  const kickoff = new Date(matchPlayedAt);
  const deltaMs = kickoff.getTime() - now.getTime();
  const hours = Math.max(1, Math.round(deltaMs / (60 * 60 * 1000)));

  const today = localDayKey(now);
  const matchDay = localDayKey(kickoff);
  if (matchDay === today) {
    if (hours <= 3) return `en ~${hours} h`;
    return 'hoy';
  }

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (matchDay === localDayKey(tomorrow)) return 'mañana';
  if (hours < 48) return `en ~${hours} h`;
  return matchDay;
}

function formatRelativePlayed(matchPlayedAt: string, now: Date): string {
  const kickoff = new Date(matchPlayedAt);
  const deltaMs = now.getTime() - kickoff.getTime();
  const hours = Math.max(1, Math.round(deltaMs / (60 * 60 * 1000)));

  const today = localDayKey(now);
  const matchDay = localDayKey(kickoff);
  if (matchDay === today) {
    if (hours <= 3) return `hace ~${hours} h`;
    return 'hoy';
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (matchDay === localDayKey(yesterday)) return 'ayer';
  if (hours < 48) return `hace ~${hours} h`;
  return matchDay;
}

function competitionSuffix(competitionName: string | null | undefined): string {
  return typeof competitionName === 'string' && competitionName.trim()
    ? ` · ${competitionName.trim().slice(0, 40)}`
    : '';
}

/**
 * Partidos de Quiero ir dentro de la ventana futura, sin los saltados, ordenados por kickoff.
 */
export function selectWantToGoNudgeMatches(
  matches: WantToGoNudgeMatch[],
  skippedMatchIds: readonly number[] = [],
  now: Date = new Date(),
  windowMs: number = WANT_TO_GO_NUDGE_WINDOW_MS,
): WantToGoNudgeMatch[] {
  const skipped = new Set(skippedMatchIds.filter((id) => Number.isFinite(id)));
  return matches
    .filter(
      (m) =>
        !skipped.has(m.match_id) &&
        isMatchInWantToGoNudgeWindow(m.match_played_at, now, windowMs),
    )
    .sort(
      (a, b) =>
        Date.parse(a.match_played_at!) - Date.parse(b.match_played_at!),
    );
}

/**
 * Partidos ya jugados sin Capsule, en ventana retrospectiva, más recientes primero.
 */
export function selectWantToGoPlayedNudgeMatches(
  matches: WantToGoNudgeMatch[],
  capsuleMatchIds: readonly number[] = [],
  skippedMatchIds: readonly number[] = [],
  now: Date = new Date(),
  windowMs: number = WANT_TO_GO_PLAYED_NUDGE_WINDOW_MS,
): WantToGoNudgeMatch[] {
  const skipped = new Set(skippedMatchIds.filter((id) => Number.isFinite(id)));
  const saved = new Set(capsuleMatchIds.filter((id) => Number.isFinite(id)));
  return matches
    .filter(
      (m) =>
        !skipped.has(m.match_id) &&
        !saved.has(m.match_id) &&
        isMatchInWantToGoPlayedWindow(m.match_played_at, now, windowMs),
    )
    .sort(
      (a, b) =>
        Date.parse(b.match_played_at!) - Date.parse(a.match_played_at!),
    );
}

function toCreateMatch(row: WantToGoNudgeMatch): FootballMatch {
  return {
    id: row.match_id,
    utcDate: row.match_played_at ?? undefined,
    homeTeam: {
      name: row.home_team_name,
      crest: row.home_team_crest ?? undefined,
    },
    awayTeam: {
      name: row.away_team_name,
      crest: row.away_team_crest ?? undefined,
    },
    score: {
      fullTime: {
        home: row.home_score ?? null,
        away: row.away_score ?? null,
      },
    },
    competition: row.competition_name ? { name: row.competition_name } : undefined,
  };
}

/** Soft nudge: partido cercano; si no, «ya jugó» sin Capsule. */
export function findWantToGoNudge(
  matches: WantToGoNudgeMatch[],
  skippedMatchIds: readonly number[] = [],
  now: Date = new Date(),
  capsuleMatchIds: readonly number[] = [],
): WantToGoNudge | null {
  const upcoming = selectWantToGoNudgeMatches(matches, skippedMatchIds, now);
  const firstUp = upcoming[0];
  if (firstUp?.match_played_at) {
    const when = formatRelativeKickoff(firstUp.match_played_at, now);
    const label = `${firstUp.home_team_name}–${firstUp.away_team_name}`;
    const extraCount = Math.max(0, upcoming.length - 1);
    const extra =
      extraCount > 0 ? ` · y ${extraCount} más en Quiero ir` : '';

    return {
      kind: 'upcoming',
      matchId: firstUp.match_id,
      homeTeam: firstUp.home_team_name,
      awayTeam: firstUp.away_team_name,
      matchPlayedAt: firstUp.match_played_at,
      extraCount,
      href: '/want-to-go',
      title: 'Partido cerca en Quiero ir',
      body: `${label}${competitionSuffix(firstUp.competition_name)} · ${when}${extra}`.slice(
        0,
        200,
      ),
      hrefLabel: 'Ver lista',
    };
  }

  const played = selectWantToGoPlayedNudgeMatches(
    matches,
    capsuleMatchIds,
    skippedMatchIds,
    now,
  );
  const firstPlayed = played[0];
  if (!firstPlayed?.match_played_at) return null;

  const when = formatRelativePlayed(firstPlayed.match_played_at, now);
  const label = `${firstPlayed.home_team_name}–${firstPlayed.away_team_name}`;
  const extraCount = Math.max(0, played.length - 1);
  const extra =
    extraCount > 0 ? ` · y ${extraCount} más sin Capsule` : '';

  return {
    kind: 'played',
    matchId: firstPlayed.match_id,
    homeTeam: firstPlayed.home_team_name,
    awayTeam: firstPlayed.away_team_name,
    matchPlayedAt: firstPlayed.match_played_at,
    extraCount,
    href: '/capsules/new',
    title: 'Ya jugó · guarda tu Capsule',
    body: `${label}${competitionSuffix(firstPlayed.competition_name)} · ${when}${extra}`.slice(
      0,
      200,
    ),
    hrefLabel: 'Guardar Capsule',
    createMatch: toCreateMatch(firstPlayed),
  };
}
