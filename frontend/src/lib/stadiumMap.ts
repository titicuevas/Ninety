import type { Capsule } from '@/types/capsule';
import { STADIUM_CATALOG, type StadiumDef } from '@/lib/stadiumCatalog';

export type StadiumVisit = {
  stadium: StadiumDef;
  visits: number;
  /** Capsules que aportaron a este pin (máx. recientes para enlazar). */
  capsuleIds: string[];
  lastWatchedAt: string | null;
  averageRating: number | null;
};

export type StadiumMapResult = {
  /** Visitas emparejadas a un estadio del catálogo. */
  visits: StadiumVisit[];
  /** Sede más visitada (empate → mejor media ★ → más reciente). */
  favorite: StadiumVisit | null;
  /** Capsules en estadio sin match de catálogo. */
  unmatchedStadiumCount: number;
  /** Total de capsules con watch_context=stadium. */
  stadiumCapsuleCount: number;
  /** Países distintos visitados (catálogo). */
  countries: string[];
};

/** Proyección equirectangular acotada a Europa occidental (SVG viewBox 0–100). */
const MAP_BOUNDS = {
  latMin: 35,
  latMax: 60,
  lngMin: -12,
  lngMax: 20,
} as const;

export function projectStadium(lat: number, lng: number): { x: number; y: number } | null {
  const { latMin, latMax, lngMin, lngMax } = MAP_BOUNDS;
  if (lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) return null;
  const x = ((lng - lngMin) / (lngMax - lngMin)) * 100;
  const y = ((latMax - lat) / (latMax - latMin)) * 100;
  return { x, y };
}

/** Normalización suave: no elimina tokens de marca (Atlético ≠ Madrid). */
function normalizeStadiumTeam(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasIndex(): Map<string, StadiumDef> {
  const map = new Map<string, StadiumDef>();
  for (const stadium of STADIUM_CATALOG) {
    for (const alias of stadium.aliases) {
      const key = normalizeStadiumTeam(alias);
      if (key && !map.has(key)) map.set(key, stadium);
    }
  }
  return map;
}

const ALIAS_INDEX = aliasIndex();

function lookupTeam(name: string): StadiumDef | null {
  const key = normalizeStadiumTeam(name);
  if (!key) return null;
  const exact = ALIAS_INDEX.get(key);
  if (exact) return exact;

  // Contención: el alias más largo gana (evita madrid ⊂ atletico de madrid)
  let best: { stadium: StadiumDef; len: number } | null = null;
  for (const [alias, stadium] of ALIAS_INDEX) {
    if (alias.length < 5 || key.length < 5) continue;
    if (!key.includes(alias) && !alias.includes(key)) continue;
    if (!best || alias.length > best.len) best = { stadium, len: alias.length };
  }
  return best?.stadium ?? null;
}

/** Resuelve estadio preferentemente por equipo local (sede). */
export function resolveStadiumForCapsule(
  capsule: Pick<Capsule, 'home_team_name' | 'away_team_name'>,
): StadiumDef | null {
  return lookupTeam(capsule.home_team_name) ?? lookupTeam(capsule.away_team_name);
}

/** Compara sedes para elegir favorita: visitas → media ★ → última visita. */
function compareStadiumVisits(a: StadiumVisit, b: StadiumVisit): number {
  if (b.visits !== a.visits) return b.visits - a.visits;
  const ar = a.averageRating ?? -1;
  const br = b.averageRating ?? -1;
  if (br !== ar) return br - ar;
  const at = a.lastWatchedAt ?? '';
  const bt = b.lastWatchedAt ?? '';
  return bt.localeCompare(at);
}

export function pickFavoriteStadium(visits: StadiumVisit[]): StadiumVisit | null {
  if (visits.length === 0) return null;
  return [...visits].sort(compareStadiumVisits)[0] ?? null;
}

/**
 * Agrega visitas a estadio a partir de capsules con watch_context === 'stadium'.
 */
export function computeStadiumMap(capsules: Capsule[]): StadiumMapResult {
  const stadiumCapsules = capsules.filter((c) => c.watch_context === 'stadium');
  const byId = new Map<
    string,
    {
      stadium: StadiumDef;
      visits: number;
      capsuleIds: string[];
      lastWatchedAt: string | null;
      ratingSum: number;
      rated: number;
    }
  >();
  let unmatched = 0;

  for (const capsule of stadiumCapsules) {
    const stadium = resolveStadiumForCapsule(capsule);
    if (!stadium) {
      unmatched++;
      continue;
    }
    const prev = byId.get(stadium.id) ?? {
      stadium,
      visits: 0,
      capsuleIds: [] as string[],
      lastWatchedAt: null as string | null,
      ratingSum: 0,
      rated: 0,
    };
    prev.visits++;
    if (prev.capsuleIds.length < 5) prev.capsuleIds.push(capsule.id);
    if (!prev.lastWatchedAt || capsule.watched_at > prev.lastWatchedAt) {
      prev.lastWatchedAt = capsule.watched_at;
    }
    if (capsule.rating != null) {
      prev.ratingSum += capsule.rating;
      prev.rated++;
    }
    byId.set(stadium.id, prev);
  }

  const visits: StadiumVisit[] = [...byId.values()]
    .map((row) => ({
      stadium: row.stadium,
      visits: row.visits,
      capsuleIds: row.capsuleIds,
      lastWatchedAt: row.lastWatchedAt,
      averageRating: row.rated > 0 ? row.ratingSum / row.rated : null,
    }))
    .sort(
      (a, b) =>
        compareStadiumVisits(a, b) || a.stadium.name.localeCompare(b.stadium.name, 'es'),
    );

  const countries = [...new Set(visits.map((v) => v.stadium.country))].sort();
  const favorite = pickFavoriteStadium(visits);

  return {
    visits,
    favorite,
    unmatchedStadiumCount: unmatched,
    stadiumCapsuleCount: stadiumCapsules.length,
    countries,
  };
}

/** Deep link al diario filtrado por contexto estadio. */
export function stadiumDiaryHref(): string {
  return '/capsules?context=stadium';
}

/** Deep link a una Capsule concreta (detalle público/propio). */
export function stadiumCapsuleHref(capsuleId: string | undefined | null): string | null {
  if (!capsuleId) return null;
  return `/c/${capsuleId}`;
}
