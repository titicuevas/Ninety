const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const WATCH_CONTEXT_LABELS: Record<string, string> = {
  stadium: 'Estadio',
  tv: 'TV',
  pub: 'Bar',
  other: 'Otro',
};

export type PublicProfileStatsRow = {
  watched_at: string;
  rating: number | null;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  watch_context?: string | null;
  photo_urls?: string[] | null;
  photo_url?: string | null;
};

export type PublicProfileStats = {
  totalMatches: number;
  averageRating: number | null;
  topTeam: { name: string; count: number } | null;
  /** Top equipos del diario (para overlap social / H2H). */
  topTeams: Array<{ name: string; count: number }>;
  topCompetition: { name: string; count: number } | null;
  peakMonth: { month: number; label: string; count: number } | null;
  fiveStarCount: number;
  topWatchContext: { name: string; count: number } | null;
  stadiumVisits: number;
  photosCount: number;
  photoCollageUrls: string[];
  matchesByMonth: number[];
  bestRated: {
    home_team_name: string;
    away_team_name: string;
    rating: number;
  } | null;
};

function topEntry(counts: Map<string, number>): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!name.trim()) continue;
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

function topNEntries(counts: Map<string, number>, n: number): Array<{ name: string; count: number }> {
  return [...counts.entries()]
    .filter(([name]) => name.trim())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

function rowPhotoUrls(row: PublicProfileStatsRow): string[] {
  if (Array.isArray(row.photo_urls) && row.photo_urls.length > 0) {
    return row.photo_urls.filter((url): url is string => typeof url === 'string' && url.length > 0);
  }
  if (typeof row.photo_url === 'string' && row.photo_url.length > 0) return [row.photo_url];
  return [];
}

function pickPhotoCollage(rows: PublicProfileStatsRow[], limit = 6): string[] {
  const sorted = [...rows].sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return b.watched_at.localeCompare(a.watched_at);
  });
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const row of sorted) {
    for (const url of rowPhotoUrls(row)) {
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
      if (urls.length >= limit) return urls;
    }
  }
  return urls;
}

export function computePublicProfileStats(rows: PublicProfileStatsRow[]): PublicProfileStats {
  const ratings = rows.map((r) => r.rating).filter((r): r is number => r != null);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;

  const teams = new Map<string, number>();
  const competitions = new Map<string, number>();
  const months = new Array<number>(12).fill(0);
  const contexts = new Map<string, number>();
  let stadiumVisits = 0;
  let photosCount = 0;
  let bestRated: PublicProfileStats['bestRated'] = null;

  for (const row of rows) {
    for (const team of [row.home_team_name, row.away_team_name]) {
      if (team.trim()) teams.set(team, (teams.get(team) ?? 0) + 1);
    }
    if (row.competition_name?.trim()) {
      competitions.set(
        row.competition_name,
        (competitions.get(row.competition_name) ?? 0) + 1,
      );
    }
    const month = Number(row.watched_at.slice(5, 7));
    if (month >= 1 && month <= 12) months[month - 1]!++;
    const contextLabel = row.watch_context ? WATCH_CONTEXT_LABELS[row.watch_context] : null;
    if (contextLabel) {
      contexts.set(contextLabel, (contexts.get(contextLabel) ?? 0) + 1);
    }
    if (row.watch_context === 'stadium') stadiumVisits++;
    photosCount += rowPhotoUrls(row).length;
    if (row.rating != null && (!bestRated || row.rating > bestRated.rating)) {
      bestRated = {
        home_team_name: row.home_team_name,
        away_team_name: row.away_team_name,
        rating: row.rating,
      };
    }
  }

  let peakMonth: PublicProfileStats['peakMonth'] = null;
  for (let i = 0; i < months.length; i++) {
    const count = months[i]!;
    if (count <= 0) continue;
    if (!peakMonth || count > peakMonth.count) {
      peakMonth = { month: i + 1, label: MONTH_NAMES_ES[i]!, count };
    }
  }

  return {
    totalMatches: rows.length,
    averageRating,
    topTeam: topEntry(teams),
    topTeams: topNEntries(teams, 5),
    topCompetition: topEntry(competitions),
    peakMonth,
    fiveStarCount: ratings.filter((r) => r >= 5).length,
    topWatchContext: topEntry(contexts),
    stadiumVisits,
    photosCount,
    photoCollageUrls: pickPhotoCollage(rows, 6),
    matchesByMonth: months,
    bestRated,
  };
}

function watchedYear(watchedAt: string): number | null {
  const year = Number(String(watchedAt).slice(0, 4));
  if (Number.isInteger(year) && year >= 1990 && year <= 2100) return year;
  return null;
}

/** Stats del Wrapped público por año (mismas filas que el resumen de por vida). */
export function groupPublicProfileStatsByYear(
  rows: PublicProfileStatsRow[],
): Record<string, PublicProfileStats> {
  const byYear = new Map<number, PublicProfileStatsRow[]>();
  for (const row of rows) {
    const year = watchedYear(row.watched_at);
    if (year == null) continue;
    const list = byYear.get(year) ?? [];
    list.push(row);
    byYear.set(year, list);
  }

  const grouped: Record<string, PublicProfileStats> = {};
  for (const [year, list] of byYear) {
    grouped[String(year)] = computePublicProfileStats(list);
  }
  return grouped;
}
