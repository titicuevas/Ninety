import type { ProfileRow } from './profileNormalize.js';

export type DiscoverCandidate = ProfileRow & {
  username: string;
};

export type DiscoverMatchReason = 'favorite_team' | 'city' | 'country' | null;

export type RankedDiscoverProfile = DiscoverCandidate & {
  match_reason: DiscoverMatchReason;
};

const TEAM_NOISE =
  /\b(real|fc|cf|cd|ud|sd|rcd|club|de|del|la|el|athletic|atletico|sporting)\b/g;

/** Normaliza texto de equipo/lugar para comparar (minúsculas, sin diacríticos). */
export function normalizeDiscoverText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function canonicalizeTeam(normalized: string): string {
  const stripped = normalized.replace(TEAM_NOISE, ' ').replace(/\s+/g, ' ').trim();
  // Si todo era ruido ("Atlético"), conservar el texto normalizado.
  return stripped || normalized;
}

/**
 * Empareja equipos favoritos con holgura: exacto, canónico (sin FC/Real/…)
 * o contención si el token significativo tiene ≥4 caracteres (Betis ↔ Real Betis).
 */
export function teamsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeDiscoverText(a);
  const nb = normalizeDiscoverText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const ca = canonicalizeTeam(na);
  const cb = canonicalizeTeam(nb);
  if (ca === cb) return true;

  const minLen = 4;
  if (ca.length >= minLen && cb.length >= minLen && (ca.includes(cb) || cb.includes(ca))) {
    return true;
  }
  if (na.length >= minLen && nb.length >= minLen && (na.includes(nb) || nb.includes(na))) {
    return true;
  }

  return false;
}

function primaryMatchReason(
  row: DiscoverCandidate,
  viewer: { favorite_team?: string | null; city?: string | null; country?: string | null },
  scoreTeam: boolean,
  scoreCity: boolean,
  scoreCountry: boolean,
): DiscoverMatchReason {
  if (scoreTeam) return 'favorite_team';
  if (scoreCity) return 'city';
  if (scoreCountry) return 'country';
  return null;
}

/**
 * Ordena candidatos: mismo equipo favorito → misma ciudad → mismo país → más recientes.
 */
export function rankDiscoverProfiles(
  candidates: DiscoverCandidate[],
  viewer: { favorite_team?: string | null; city?: string | null; country?: string | null },
  followingIds: Set<string>,
  limit: number,
): RankedDiscoverProfile[] {
  const myCity = normalizeDiscoverText(viewer.city);
  const myCountry = normalizeDiscoverText(viewer.country);

  return candidates
    .filter((row) => row.username && !followingIds.has(row.id))
    .map((row) => {
      const scoreTeam = teamsMatch(viewer.favorite_team, row.favorite_team);
      const scoreCity = !!myCity && normalizeDiscoverText(row.city) === myCity;
      const scoreCountry = !!myCountry && normalizeDiscoverText(row.country) === myCountry;

      let score = 0;
      if (scoreTeam) score += 100;
      if (scoreCity) score += 40;
      if (scoreCountry) score += 20;

      const created = row.created_at ? new Date(row.created_at).getTime() : 0;
      return {
        row,
        score,
        created,
        match_reason: primaryMatchReason(row, viewer, scoreTeam, scoreCity, scoreCountry),
      };
    })
    .sort((a, b) => b.score - a.score || b.created - a.created)
    .slice(0, limit)
    .map((entry) => ({ ...entry.row, match_reason: entry.match_reason }));
}

/** Patrón seguro para `ilike` a partir del equipo del viewer. */
export function favoriteTeamIlikePattern(team: string): string | null {
  const cleaned = team.replace(/[%_]/g, '').trim();
  if (cleaned.length < 2) return null;
  return `%${cleaned}%`;
}
