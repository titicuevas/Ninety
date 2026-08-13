/** Ventana on-device: partidos en las próximas 48 h (paridad con push). */
export const WANT_TO_GO_NUDGE_WINDOW_MS = 48 * 60 * 60 * 1000;

export type WantToGoNudgeMatch = {
  match_id: number;
  home_team_name: string;
  away_team_name: string;
  match_played_at: string | null;
  competition_name?: string | null;
};

export type WantToGoNudge = {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  matchPlayedAt: string;
  extraCount: number;
  href: string;
  title: string;
  body: string;
  hrefLabel: string;
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

/**
 * Partidos de Quiero ir dentro de la ventana, sin los saltados, ordenados por kickoff.
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

/** Soft nudge: el partido más cercano (+ contador de extras). */
export function findWantToGoNudge(
  matches: WantToGoNudgeMatch[],
  skippedMatchIds: readonly number[] = [],
  now: Date = new Date(),
): WantToGoNudge | null {
  const due = selectWantToGoNudgeMatches(matches, skippedMatchIds, now);
  const first = due[0];
  if (!first?.match_played_at) return null;

  const when = formatRelativeKickoff(first.match_played_at, now);
  const label = `${first.home_team_name}–${first.away_team_name}`;
  const extraCount = Math.max(0, due.length - 1);
  const extra =
    extraCount > 0
      ? ` · y ${extraCount} más en Quiero ir`
      : '';
  const comp =
    typeof first.competition_name === 'string' && first.competition_name.trim()
      ? ` · ${first.competition_name.trim().slice(0, 40)}`
      : '';

  return {
    matchId: first.match_id,
    homeTeam: first.home_team_name,
    awayTeam: first.away_team_name,
    matchPlayedAt: first.match_played_at,
    extraCount,
    href: '/want-to-go',
    title: 'Partido cerca en Quiero ir',
    body: `${label}${comp} · ${when}${extra}`.slice(0, 200),
    hrefLabel: 'Ver lista',
  };
}
