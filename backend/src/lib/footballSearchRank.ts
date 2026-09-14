/** Ranking puro de resultados de búsqueda (sin I/O ni env). */

export type RankableMatch = {
  id: number;
  utcDate?: string;
  status?: string;
};

const DEFAULT_LIMIT = 30;

function matchKickoffMs(match: RankableMatch): number | null {
  if (!match.utcDate) return null;
  const ms = Date.parse(match.utcDate);
  return Number.isNaN(ms) ? null : ms;
}

/** Próximos primero (antes → después), luego jugados (más reciente primero). */
export function sortMatchesForSearch<T extends RankableMatch>(
  matches: T[],
  now: Date = new Date(),
): T[] {
  const nowMs = now.getTime();
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const match of matches) {
    const kickoff = matchKickoffMs(match);
    if (kickoff != null && kickoff >= nowMs) upcoming.push(match);
    else past.push(match);
  }

  upcoming.sort((a, b) => (matchKickoffMs(a) ?? 0) - (matchKickoffMs(b) ?? 0));
  past.sort((a, b) => (matchKickoffMs(b) ?? 0) - (matchKickoffMs(a) ?? 0));
  return [...upcoming, ...past];
}

/**
 * Reserva hueco para próximos y para jugados (Capsules + Quiero ir).
 * Sin esto, 30 próximos llenarían el tope y desaparecerían los recientes.
 */
export function takeSearchResults<T extends RankableMatch>(
  matches: T[],
  limit: number = DEFAULT_LIMIT,
  now: Date = new Date(),
): T[] {
  const sorted = sortMatchesForSearch(matches, now);
  const nowMs = now.getTime();
  const upcoming = sorted.filter((m) => {
    const kickoff = matchKickoffMs(m);
    return kickoff != null && kickoff >= nowMs;
  });
  const past = sorted.filter((m) => {
    const kickoff = matchKickoffMs(m);
    return !(kickoff != null && kickoff >= nowMs);
  });

  const upcomingCap = Math.min(upcoming.length, Math.max(10, Math.floor(limit / 2)));
  const selectedUpcoming = upcoming.slice(0, upcomingCap);
  const selectedPast = past.slice(0, Math.max(0, limit - selectedUpcoming.length));
  return [...selectedUpcoming, ...selectedPast];
}
