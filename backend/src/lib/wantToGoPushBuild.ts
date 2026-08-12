import { localDayKeyInTimeZone } from './diaryPushBuild.js';

/** Ventana por defecto: partidos en las próximas 48 h. */
export const WANT_TO_GO_REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Máx. pushes por usuario y pasada de cron (evita ráfagas). */
export const WANT_TO_GO_MAX_PUSHES_PER_FLUSH = 3;

export type WantToGoPushMatch = {
  match_id: number;
  home_team_name: string;
  away_team_name: string;
  match_played_at: string;
  competition_name?: string | null;
};

export type WantToGoPushPayload = {
  title: string;
  body: string;
  url: string;
};

export function wantToGoEventKey(matchId: number): string {
  return String(matchId);
}

/** Partido futuro dentro de la ventana (p. ej. 0–48 h). Sin fecha → no. */
export function isMatchInWantToGoReminderWindow(
  matchPlayedAt: string | null | undefined,
  now: Date,
  windowMs: number = WANT_TO_GO_REMINDER_WINDOW_MS,
): boolean {
  if (matchPlayedAt == null || matchPlayedAt === '') return false;
  const kickoffMs = Date.parse(matchPlayedAt);
  if (Number.isNaN(kickoffMs)) return false;
  const delta = kickoffMs - now.getTime();
  return delta > 0 && delta <= windowMs;
}

export function selectWantToGoMatchesDue(
  matches: WantToGoPushMatch[],
  now: Date,
  sentKeys: Set<string>,
  options?: { windowMs?: number; limit?: number },
): WantToGoPushMatch[] {
  const windowMs = options?.windowMs ?? WANT_TO_GO_REMINDER_WINDOW_MS;
  const limit = options?.limit ?? WANT_TO_GO_MAX_PUSHES_PER_FLUSH;

  return matches
    .filter(
      (m) =>
        isMatchInWantToGoReminderWindow(m.match_played_at, now, windowMs) &&
        !sentKeys.has(wantToGoEventKey(m.match_id)),
    )
    .sort(
      (a, b) => Date.parse(a.match_played_at) - Date.parse(b.match_played_at),
    )
    .slice(0, Math.max(0, limit));
}

function formatRelativeKickoff(
  matchPlayedAt: string,
  now: Date,
  timeZone: string,
): string {
  const kickoff = new Date(matchPlayedAt);
  const deltaMs = kickoff.getTime() - now.getTime();
  const hours = Math.max(1, Math.round(deltaMs / (60 * 60 * 1000)));

  const today = localDayKeyInTimeZone(now, timeZone);
  const matchDay = localDayKeyInTimeZone(kickoff, timeZone);
  if (matchDay === today) {
    if (hours <= 3) return `en ~${hours} h`;
    return 'hoy';
  }

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (matchDay === localDayKeyInTimeZone(tomorrow, timeZone)) {
    return 'mañana';
  }

  if (hours < 48) return `en ~${hours} h`;
  return matchDay;
}

export function buildWantToGoPushPayload(
  match: WantToGoPushMatch,
  now: Date,
  timeZone: string,
): WantToGoPushPayload {
  const label = `${match.home_team_name}–${match.away_team_name}`;
  const when = formatRelativeKickoff(match.match_played_at, now, timeZone);
  const comp =
    typeof match.competition_name === 'string' && match.competition_name.trim()
      ? ` · ${match.competition_name.trim().slice(0, 40)}`
      : '';

  return {
    title: 'Quiero ir · partido cerca',
    body: `${label}${comp} · ${when}`.slice(0, 180),
    url: '/want-to-go',
  };
}
