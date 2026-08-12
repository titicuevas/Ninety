import {
  favoriteTeamIlikePattern,
  normalizeDiscoverText,
  teamsMatch,
} from './discoverProfiles.js';
import type { ProfileRow } from './profileNormalize.js';

const TEAM_NOISE_TOKENS = new Set([
  'real',
  'fc',
  'cf',
  'cd',
  'ud',
  'sd',
  'rcd',
  'club',
  'de',
  'del',
  'la',
  'el',
  'athletic',
  'atletico',
  'sporting',
]);

/** Slug estable para URLs `/teams/:slug`. */
export function slugifyTeamName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || 'equipo';
}

/** Texto de consulta a partir del slug (`real-betis` → `real betis`). */
export function teamQueryFromSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, ' ')
    .trim();
}

/** Valida un slug de equipo en la URL. */
export function isValidTeamSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim()) && slug.trim().length >= 2;
}

/**
 * Patrón `ilike` para acotar candidatos en DB a partir del slug.
 * Usa el token significativo más largo (≥4) para no perder «Betis» vs «Real Betis».
 */
export function teamSlugIlikePattern(slug: string): string | null {
  const query = teamQueryFromSlug(slug);
  if (!query) return null;

  const tokens = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !TEAM_NOISE_TOKENS.has(t));

  const best = tokens.sort((a, b) => b.length - a.length)[0] ?? query;
  return favoriteTeamIlikePattern(best);
}

/** ¿El favorite_team del perfil pertenece a la página de este slug? */
export function profileMatchesTeamSlug(
  favoriteTeam: string | null | undefined,
  slug: string,
): boolean {
  if (!favoriteTeam?.trim() || !isValidTeamSlug(slug)) return false;
  if (slugifyTeamName(favoriteTeam) === slug.trim()) return true;
  return teamsMatch(favoriteTeam, teamQueryFromSlug(slug));
}

export type TeamFanCandidate = ProfileRow & {
  username: string;
  public_capsules_count?: number;
};

/**
 * Nombre a mostrar: coincide exacta de slug → moda entre matches → título del slug.
 */
export function resolveTeamDisplayName(
  slug: string,
  profiles: Array<{ favorite_team?: string | null }>,
): string {
  const normalizedSlug = slug.trim();
  const exact = profiles.find(
    (p) => p.favorite_team && slugifyTeamName(p.favorite_team) === normalizedSlug,
  );
  if (exact?.favorite_team?.trim()) return exact.favorite_team.trim();

  const counts = new Map<string, number>();
  for (const p of profiles) {
    const team = p.favorite_team?.trim();
    if (!team) continue;
    counts.set(team, (counts.get(team) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [team, count] of counts) {
    if (count > bestCount) {
      best = team;
      bestCount = count;
    }
  }
  if (best) return best;

  return teamQueryFromSlug(normalizedSlug)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Filtra por slug, excluye bloqueados, ordena (sin seguir → más Capsules → más reciente)
 * y pagina.
 */
export function rankTeamFans(
  candidates: TeamFanCandidate[],
  slug: string,
  options: {
    viewerId?: string;
    blockedIds?: ReadonlySet<string>;
    followingIds?: ReadonlySet<string>;
    limit: number;
    offset: number;
  },
): { profiles: TeamFanCandidate[]; total: number } {
  const blocked = options.blockedIds ?? new Set<string>();
  const following = options.followingIds ?? new Set<string>();

  const matched = candidates
    .filter((row) => {
      if (!row.username) return false;
      if (blocked.has(row.id)) return false;
      return profileMatchesTeamSlug(row.favorite_team, slug);
    })
    .map((row) => {
      const activity = Math.max(0, row.public_capsules_count ?? 0);
      const created = row.created_at ? new Date(row.created_at).getTime() : 0;
      const followPenalty =
        options.viewerId && row.id !== options.viewerId && following.has(row.id) ? 1 : 0;
      return { row, activity, created, followPenalty };
    })
    .sort(
      (a, b) =>
        a.followPenalty - b.followPenalty ||
        b.activity - a.activity ||
        b.created - a.created ||
        normalizeDiscoverText(a.row.username).localeCompare(normalizeDiscoverText(b.row.username)),
    );

  const total = matched.length;
  const profiles = matched
    .slice(options.offset, options.offset + options.limit)
    .map((entry) => entry.row);

  return { profiles, total };
}
