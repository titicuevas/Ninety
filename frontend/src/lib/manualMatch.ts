import type { FootballMatch } from '@/types/football';

/** IDs de football-data.org son positivos; los manuales usan enteros negativos. */
export function isManualMatchId(id: number): boolean {
  return Number.isInteger(id) && id < 0;
}

export function normalizeManualTeamName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

/**
 * Hash estable FNV-1a → entero negativo en [-2147483647, -1].
 * Misma pareja + fecha = mismo match_id (idempotencia por usuario).
 */
export function manualMatchId(input: {
  homeTeam: string;
  awayTeam: string;
  playedAt: string;
}): number {
  const key = `${normalizeManualTeamName(input.homeTeam)}|${normalizeManualTeamName(input.awayTeam)}|${input.playedAt.trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return -((unsigned % 0x7fffffff) + 1);
}

export type ManualMatchInput = {
  homeTeam: string;
  awayTeam: string;
  /** YYYY-MM-DD */
  playedAt: string;
  competition?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
};

export function buildManualFootballMatch(input: ManualMatchInput): FootballMatch {
  const home = input.homeTeam.trim().replace(/\s+/g, ' ');
  const away = input.awayTeam.trim().replace(/\s+/g, ' ');
  const playedAt = input.playedAt.trim();
  const competition = input.competition?.trim() || null;
  const homeScore = input.homeScore ?? null;
  const awayScore = input.awayScore ?? null;

  return {
    id: manualMatchId({ homeTeam: home, awayTeam: away, playedAt }),
    utcDate: `${playedAt}T12:00:00.000Z`,
    status: 'FINISHED',
    homeTeam: { name: home },
    awayTeam: { name: away },
    score:
      homeScore != null && awayScore != null
        ? { fullTime: { home: homeScore, away: awayScore } }
        : undefined,
    competition: competition ? { name: competition } : undefined,
  };
}
