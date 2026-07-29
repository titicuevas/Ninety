import type { Capsule } from '@/types/capsule';

export interface CapsuleStats {
  totalMatches: number;
  averageRating: number | null;
  ratedCount: number;
  notesCount: number;
  photosCount: number;
  topCompetition: { name: string; count: number } | null;
  topTeam: { name: string; count: number } | null;
  lastWatched: Capsule | null;
  bestRated: Capsule | null;
  recentCapsules: Capsule[];
  /** Meses con al menos un partido (1–12), solo útil en vistas anuales */
  activeMonths: number;
  /** Racha más larga de días consecutivos con partido */
  longestStreak: number;
  /** Top 3 equipos más vistos */
  topTeams: Array<{ name: string; count: number }>;
  /** Partidos por mes (índice 0 = enero, 11 = diciembre) */
  matchesByMonth: number[];
}

export type WrappedScope = 'all' | number;

function topEntry(counts: Map<string, number>): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;

  for (const [name, count] of counts) {
    if (!name.trim()) continue;
    if (!best || count > best.count) {
      best = { name, count };
    }
  }

  return best;
}

function teamCounts(capsules: Capsule[]) {
  const counts = new Map<string, number>();

  for (const capsule of capsules) {
    for (const team of [capsule.home_team_name, capsule.away_team_name]) {
      counts.set(team, (counts.get(team) ?? 0) + 1);
    }
  }

  return counts;
}

function competitionCounts(capsules: Capsule[]) {
  const counts = new Map<string, number>();

  for (const capsule of capsules) {
    if (!capsule.competition_name) continue;
    counts.set(capsule.competition_name, (counts.get(capsule.competition_name) ?? 0) + 1);
  }

  return counts;
}

function computeLongestStreak(capsules: Capsule[]): number {
  if (capsules.length === 0) return 0;
  const days = [...new Set(capsules.map((c) => c.watched_at.slice(0, 10)))].sort();
  let max = 1;
  let cur = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]).getTime();
    const curr = new Date(days[i]).getTime();
    if (curr - prev === 86_400_000) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 1;
    }
  }
  return max;
}

function topNEntries(counts: Map<string, number>, n: number): Array<{ name: string; count: number }> {
  return [...counts.entries()]
    .filter(([name]) => name.trim())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

function computeMatchesByMonth(capsules: Capsule[]): number[] {
  const months = new Array<number>(12).fill(0);
  for (const c of capsules) {
    const m = Number(c.watched_at.slice(5, 7));
    if (m >= 1 && m <= 12) months[m - 1]++;
  }
  return months;
}

function capsuleYear(capsule: Capsule): number {
  return Number(capsule.watched_at.slice(0, 4));
}

export function listCapsuleYears(capsules: Capsule[]): number[] {
  const years = new Set<number>();
  for (const capsule of capsules) {
    const year = capsuleYear(capsule);
    if (Number.isFinite(year)) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

export function filterCapsulesByScope(capsules: Capsule[], scope: WrappedScope): Capsule[] {
  if (scope === 'all') return capsules;
  return capsules.filter((c) => capsuleYear(c) === scope);
}

export function defaultWrappedScope(capsules: Capsule[]): WrappedScope {
  const years = listCapsuleYears(capsules);
  if (years.length === 0) return 'all';
  const currentYear = new Date().getFullYear();
  if (years.includes(currentYear)) return currentYear;
  return years[0];
}

export function computeCapsuleStats(capsules: Capsule[]): CapsuleStats {
  const ratings = capsules.map((c) => c.rating).filter((r): r is number => r != null);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;

  const sortedByWatched = [...capsules].sort((a, b) => b.watched_at.localeCompare(a.watched_at));
  const ratedCapsules = capsules.filter((c) => c.rating != null);
  const bestRated =
    ratedCapsules.length > 0
      ? [...ratedCapsules].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]
      : null;

  const months = new Set<number>();
  for (const capsule of capsules) {
    const month = Number(capsule.watched_at.slice(5, 7));
    if (month >= 1 && month <= 12) months.add(month);
  }

  const photosCount = capsules.reduce((sum, c) => {
    const urls = c.photo_urls?.length ? c.photo_urls.length : c.photo_url ? 1 : 0;
    return sum + urls;
  }, 0);

  return {
    totalMatches: capsules.length,
    averageRating,
    ratedCount: ratings.length,
    notesCount: capsules.filter((c) => c.note?.trim()).length,
    photosCount,
    topCompetition: topEntry(competitionCounts(capsules)),
    topTeam: topEntry(teamCounts(capsules)),
    lastWatched: sortedByWatched[0] ?? null,
    bestRated,
    recentCapsules: sortedByWatched.slice(0, 3),
    activeMonths: months.size,
    longestStreak: computeLongestStreak(capsules),
    topTeams: topNEntries(teamCounts(capsules), 3),
    matchesByMonth: computeMatchesByMonth(capsules),
  };
}

export function formatRating(value: number | null) {
  if (value == null) return '—';
  return value.toFixed(1);
}

export function buildWrappedShareText(name: string, scope: WrappedScope, stats: CapsuleStats): string {
  const period = scope === 'all' ? 'todo mi diario' : String(scope);
  const lines = [
    `⚽ Mi Wrapped Ninety · ${period}`,
    `${name}`,
    '',
    `${stats.totalMatches} partido${stats.totalMatches === 1 ? '' : 's'} · media ${formatRating(stats.averageRating)}⭐`,
  ];
  if (stats.topTeam) lines.push(`Equipo top: ${stats.topTeam.name}`);
  if (stats.topCompetition) lines.push(`Competición: ${stats.topCompetition.name}`);
  if (stats.bestRated) {
    lines.push(
      `Mejor partido: ${stats.bestRated.home_team_name} vs ${stats.bestRated.away_team_name}`,
    );
  }
  lines.push('', 'ninety.up.railway.app');
  return lines.join('\n');
}
