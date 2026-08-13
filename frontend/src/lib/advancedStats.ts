import type { Capsule } from '@/types/capsule';
import { WATCH_CONTEXT_LABELS, WATCH_CONTEXTS, isWatchContext, type WatchContext } from '@/lib/watchContext';

export type RatingBucket = { stars: 1 | 2 | 3 | 4 | 5; count: number };

export type WatchContextShare = {
  key: WatchContext;
  label: string;
  count: number;
  /** 0–100 */
  pct: number;
};

export type RivalryStat = {
  pairKey: string;
  teamA: string;
  teamB: string;
  count: number;
  averageRating: number | null;
};

export type FavoriteTeamRecord = {
  team: string;
  watched: number;
  wins: number;
  draws: number;
  losses: number;
  /** Partidos con marcador conocido. */
  decided: number;
};

export type AdvancedStats = {
  ratingDistribution: RatingBucket[];
  watchContextMix: WatchContextShare[];
  topRivalries: RivalryStat[];
  uniqueTeams: number;
  uniqueCompetitions: number;
  /** Emparejamientos vistos 2+ veces. */
  repeatRivalries: number;
  ratedShare: number;
  photoShare: number;
  noteShare: number;
  /** Media de días entre partidos consecutivos (por watched_at). */
  avgDaysBetween: number | null;
  favoriteTeamRecord: FavoriteTeamRecord | null;
};

const TEAM_NOISE =
  /\b(real|fc|cf|cd|ud|sd|rcd|club|de|del|la|el|athletic|atletico|sporting)\b/g;

/** Normaliza nombre de equipo para comparar. */
export function normalizeTeamName(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(TEAM_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function teamsRoughlyMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const minLen = 4;
  if (na.length >= minLen && nb.length >= minLen && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return false;
}

function rivalryKey(home: string, away: string): { key: string; teamA: string; teamB: string } {
  const a = home.trim();
  const b = away.trim();
  if (a.localeCompare(b, 'es', { sensitivity: 'base' }) <= 0) {
    return { key: `${a.toLowerCase()}::${b.toLowerCase()}`, teamA: a, teamB: b };
  }
  return { key: `${b.toLowerCase()}::${a.toLowerCase()}`, teamA: b, teamB: a };
}

function computeFavoriteTeamRecord(
  capsules: Capsule[],
  favoriteTeam: string | null | undefined,
): FavoriteTeamRecord | null {
  const team = favoriteTeam?.trim();
  if (!team) return null;

  let watched = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let decided = 0;

  for (const c of capsules) {
    const isHome = teamsRoughlyMatch(c.home_team_name, team);
    const isAway = teamsRoughlyMatch(c.away_team_name, team);
    if (!isHome && !isAway) continue;
    watched++;

    if (c.home_score == null || c.away_score == null) continue;
    decided++;
    if (c.home_score === c.away_score) {
      draws++;
      continue;
    }
    const homeWon = c.home_score > c.away_score;
    if ((isHome && homeWon) || (isAway && !homeWon)) wins++;
    else losses++;
  }

  if (watched === 0) return null;
  return { team, watched, wins, draws, losses, decided };
}

/**
 * Estadísticas avanzadas on-read a partir de capsules (y equipo favorito opcional).
 */
export function computeAdvancedStats(
  capsules: Capsule[],
  options?: { favoriteTeam?: string | null },
): AdvancedStats {
  const total = capsules.length;
  const ratingCounts = [0, 0, 0, 0, 0, 0];
  let rated = 0;
  let withPhoto = 0;
  let withNote = 0;

  const contextCounts = new Map<WatchContext, number>();
  for (const key of WATCH_CONTEXTS) contextCounts.set(key, 0);

  const teams = new Set<string>();
  const competitions = new Set<string>();
  const rivalryMap = new Map<string, { teamA: string; teamB: string; count: number; ratingSum: number; rated: number }>();

  for (const c of capsules) {
    if (c.rating != null && c.rating >= 1 && c.rating <= 5) {
      rated++;
      ratingCounts[Math.round(c.rating)]++;
    }
    const photos = c.photo_urls?.length ? c.photo_urls.length : c.photo_url ? 1 : 0;
    if (photos > 0) withPhoto++;
    if (c.note?.trim()) withNote++;

    if (isWatchContext(c.watch_context)) {
      contextCounts.set(c.watch_context, (contextCounts.get(c.watch_context) ?? 0) + 1);
    }

    for (const name of [c.home_team_name, c.away_team_name]) {
      const n = name.trim();
      if (n) teams.add(n.toLowerCase());
    }
    if (c.competition_name?.trim()) competitions.add(c.competition_name.trim().toLowerCase());

    const { key, teamA, teamB } = rivalryKey(c.home_team_name, c.away_team_name);
    const prev = rivalryMap.get(key) ?? { teamA, teamB, count: 0, ratingSum: 0, rated: 0 };
    prev.count++;
    if (c.rating != null) {
      prev.ratingSum += c.rating;
      prev.rated++;
    }
    rivalryMap.set(key, prev);
  }

  const withContext = [...contextCounts.values()].reduce((a, b) => a + b, 0);
  const watchContextMix: WatchContextShare[] = [];
  for (const key of WATCH_CONTEXTS) {
    const count = contextCounts.get(key) ?? 0;
    if (count > 0) {
      watchContextMix.push({
        key,
        label: WATCH_CONTEXT_LABELS[key],
        count,
        pct: withContext > 0 ? Math.round((count / withContext) * 100) : 0,
      });
    }
  }

  const topRivalries: RivalryStat[] = [];
  for (const [pairKey, row] of rivalryMap.entries()) {
    if (row.count >= 2) {
      topRivalries.push({
        pairKey,
        teamA: row.teamA,
        teamB: row.teamB,
        count: row.count,
        averageRating: row.rated > 0 ? row.ratingSum / row.rated : null,
      });
    }
  }
  topRivalries.sort((a, b) => b.count - a.count || (b.averageRating ?? 0) - (a.averageRating ?? 0));
  topRivalries.splice(5);

  const days = [...new Set(capsules.map((c) => c.watched_at.slice(0, 10)))].sort();
  let avgDaysBetween: number | null = null;
  if (days.length >= 2) {
    const first = new Date(days[0]).getTime();
    const last = new Date(days[days.length - 1]).getTime();
    const spanDays = Math.max(1, Math.round((last - first) / 86_400_000));
    avgDaysBetween = Math.round((spanDays / (days.length - 1)) * 10) / 10;
  }

  const ratingDistribution: RatingBucket[] = ([1, 2, 3, 4, 5] as const).map((stars) => ({
    stars,
    count: ratingCounts[stars],
  }));

  return {
    ratingDistribution,
    watchContextMix,
    topRivalries,
    uniqueTeams: teams.size,
    uniqueCompetitions: competitions.size,
    repeatRivalries: topRivalries.length,
    ratedShare: total > 0 ? rated / total : 0,
    photoShare: total > 0 ? withPhoto / total : 0,
    noteShare: total > 0 ? withNote / total : 0,
    avgDaysBetween,
    favoriteTeamRecord: computeFavoriteTeamRecord(capsules, options?.favoriteTeam),
  };
}

export function formatSharePct(share: number): string {
  return `${Math.round(share * 100)}%`;
}
