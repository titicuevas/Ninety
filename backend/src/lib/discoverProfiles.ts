import type { ProfileRow } from './profileNormalize.js';

export type DiscoverCandidate = ProfileRow & {
  username: string;
  /** Capsules públicas recientes del perfil (heurística en frío). */
  public_capsules_count?: number;
};

export type DiscoverMatchReason = 'favorite_team' | 'city' | 'country' | 'active' | null;

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
  scoreTeam: boolean,
  scoreCity: boolean,
  scoreCountry: boolean,
  hasActivity: boolean,
): DiscoverMatchReason {
  if (scoreTeam) return 'favorite_team';
  if (scoreCity) return 'city';
  if (scoreCountry) return 'country';
  if (hasActivity) return 'active';
  return null;
}

/**
 * Ordena candidatos: mismo equipo favorito → misma ciudad → mismo país →
 * actividad pública reciente → más recientes.
 * Sirve en frío (sin follows / sin equipo favorito): prioriza perfiles con Capsules.
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
      const activityCount = Math.max(0, row.public_capsules_count ?? 0);
      const hasActivity = activityCount > 0;

      let score = 0;
      if (scoreTeam) score += 100;
      if (scoreCity) score += 40;
      if (scoreCountry) score += 20;
      // Hasta +30 por Capsules públicas recientes (descubrimiento en frío).
      if (hasActivity) score += Math.min(activityCount, 10) * 3;

      const created = row.created_at ? new Date(row.created_at).getTime() : 0;
      return {
        row,
        score,
        created,
        activityCount,
        match_reason: primaryMatchReason(scoreTeam, scoreCity, scoreCountry, hasActivity),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || b.activityCount - a.activityCount || b.created - a.created,
    )
    .slice(0, limit)
    .map((entry) => ({ ...entry.row, match_reason: entry.match_reason }));
}

/** Patrón seguro para `ilike` a partir del equipo del viewer. */
export function favoriteTeamIlikePattern(team: string): string | null {
  const cleaned = team.replace(/[%_]/g, '').trim();
  if (cleaned.length < 2) return null;
  return `%${cleaned}%`;
}

/** Agrega conteos de Capsules públicas por autor (pool reciente). */
export function tallyPublicCapsuleActivity(
  rows: Array<{ user_id: string }>,
  excludeUserId?: string,
  blockedIds?: Set<string>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = row.user_id;
    if (!id || id === excludeUserId) continue;
    if (blockedIds?.has(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
