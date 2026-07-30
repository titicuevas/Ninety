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
};

export type PublicProfileStats = {
  totalMatches: number;
  averageRating: number | null;
  topTeam: { name: string; count: number } | null;
  topCompetition: { name: string; count: number } | null;
  peakMonth: { month: number; label: string; count: number } | null;
  fiveStarCount: number;
  topWatchContext: { name: string; count: number } | null;
};

function topEntry(counts: Map<string, number>): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (!name.trim()) continue;
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

export function computePublicProfileStats(rows: PublicProfileStatsRow[]): PublicProfileStats {
  const ratings = rows.map((r) => r.rating).filter((r): r is number => r != null);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;

  const teams = new Map<string, number>();
  const competitions = new Map<string, number>();
  const months = new Array<number>(12).fill(0);
  const contexts = new Map<string, number>();

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
    topCompetition: topEntry(competitions),
    peakMonth,
    fiveStarCount: ratings.filter((r) => r >= 5).length,
    topWatchContext: topEntry(contexts),
  };
}
