import type { ProfileRow } from './profileNormalize.js';

export type DiscoverCandidate = ProfileRow & {
  username: string;
};

function normalizeTeam(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * Ordena candidatos: mismo equipo favorito → misma ciudad → mismo país → más recientes.
 */
export function rankDiscoverProfiles(
  candidates: DiscoverCandidate[],
  viewer: { favorite_team?: string | null; city?: string | null; country?: string | null },
  followingIds: Set<string>,
  limit: number,
): DiscoverCandidate[] {
  const myTeam = normalizeTeam(viewer.favorite_team);
  const myCity = normalizeTeam(viewer.city);
  const myCountry = normalizeTeam(viewer.country);

  return candidates
    .filter((row) => row.username && !followingIds.has(row.id))
    .map((row) => {
      let score = 0;
      if (myTeam && normalizeTeam(row.favorite_team) === myTeam) score += 100;
      if (myCity && normalizeTeam(row.city) === myCity) score += 40;
      if (myCountry && normalizeTeam(row.country) === myCountry) score += 20;
      const created = row.created_at ? new Date(row.created_at).getTime() : 0;
      return { row, score, created };
    })
    .sort((a, b) => b.score - a.score || b.created - a.created)
    .slice(0, limit)
    .map((entry) => entry.row);
}
