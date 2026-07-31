import type { Capsule } from '@/types/capsule';
import { getCapsulePhotoUrls } from '@/lib/capsulePhotos';
import { WATCH_CONTEXT_LABELS, isWatchContext } from '@/lib/watchContext';
import { siteUrl } from '@/lib/siteUrl';

export interface CapsuleStats {
  totalMatches: number;
  averageRating: number | null;
  ratedCount: number;
  notesCount: number;
  photosCount: number;
  /** Partidos vistos en estadio */
  stadiumVisits: number;
  /** Hasta 6 fotos del periodo (mejor valoradas / recientes) */
  photoCollageUrls: string[];
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
  /** Top 3 competiciones */
  topCompetitions: Array<{ name: string; count: number }>;
  /** Partidos por mes (índice 0 = enero, 11 = diciembre) */
  matchesByMonth: number[];
  /** Mes con más partidos (1–12) */
  peakMonth: { month: number; count: number } | null;
  /** Primer partido del periodo (por watched_at) */
  firstWatched: Capsule | null;
  /** Partidos valorados con 5 estrellas */
  fiveStarCount: number;
  /** Contexto de visionado más frecuente */
  topWatchContext: { name: string; count: number } | null;
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

function computePeakMonth(matchesByMonth: number[]): { month: number; count: number } | null {
  let peak: { month: number; count: number } | null = null;
  for (let i = 0; i < matchesByMonth.length; i++) {
    const count = matchesByMonth[i];
    if (count <= 0) continue;
    if (!peak || count > peak.count) peak = { month: i + 1, count };
  }
  return peak;
}

/** Fotos del periodo priorizando mejor valoración y fecha reciente. */
export function pickWrappedPhotoUrls(
  capsules: Array<{
    watched_at: string;
    rating?: number | null;
    photo_urls?: string[] | null;
    photo_url?: string | null;
  }>,
  limit = 6,
): string[] {
  const sorted = [...capsules].sort((a, b) => {
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return b.watched_at.localeCompare(a.watched_at);
  });
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const capsule of sorted) {
    for (const url of getCapsulePhotoUrls(capsule)) {
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
      if (urls.length >= limit) return urls;
    }
  }
  return urls;
}

export const MONTH_NAMES_ES = [
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

export function parseWrappedScopeParam(value: string | null | undefined): WrappedScope | null {
  if (value == null || value === '') return null;
  if (value === 'all') return 'all';
  const year = Number(value);
  if (Number.isInteger(year) && year >= 1990 && year <= 2100) return year;
  return null;
}

export function wrappedScopeToParam(scope: WrappedScope): string {
  return scope === 'all' ? 'all' : String(scope);
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

  const stadiumVisits = capsules.filter((c) => c.watch_context === 'stadium').length;
  const photoCollageUrls = pickWrappedPhotoUrls(capsules, 6);

  const matchesByMonth = computeMatchesByMonth(capsules);
  const competitions = competitionCounts(capsules);

  const watchContextCounts = new Map<string, number>();
  for (const capsule of capsules) {
    if (!isWatchContext(capsule.watch_context)) continue;
    const label = WATCH_CONTEXT_LABELS[capsule.watch_context];
    watchContextCounts.set(label, (watchContextCounts.get(label) ?? 0) + 1);
  }

  return {
    totalMatches: capsules.length,
    averageRating,
    ratedCount: ratings.length,
    notesCount: capsules.filter((c) => c.note?.trim()).length,
    photosCount,
    stadiumVisits,
    photoCollageUrls,
    topCompetition: topEntry(competitions),
    topTeam: topEntry(teamCounts(capsules)),
    lastWatched: sortedByWatched[0] ?? null,
    firstWatched: sortedByWatched[sortedByWatched.length - 1] ?? null,
    bestRated,
    recentCapsules: sortedByWatched.slice(0, 3),
    activeMonths: months.size,
    longestStreak: computeLongestStreak(capsules),
    topTeams: topNEntries(teamCounts(capsules), 3),
    topCompetitions: topNEntries(competitions, 3),
    matchesByMonth,
    peakMonth: computePeakMonth(matchesByMonth),
    fiveStarCount: ratings.filter((r) => r >= 5).length,
    topWatchContext: topEntry(watchContextCounts),
  };
}

export function formatRating(value: number | null) {
  if (value == null) return '—';
  return value.toFixed(1);
}

export function buildWrappedShareText(
  name: string,
  scope: WrappedScope,
  stats: CapsuleStats,
  profileUrl?: string | null,
): string {
  const period = scope === 'all' ? 'todo mi diario' : String(scope);
  const lines = [
    `⚽ Mi Wrapped Ninety · ${period}`,
    `${name}`,
    '',
    `${stats.totalMatches} partido${stats.totalMatches === 1 ? '' : 's'} · media ${formatRating(stats.averageRating)}⭐`,
  ];
  if (stats.topTeam) lines.push(`Equipo top: ${stats.topTeam.name}`);
  if (stats.topCompetition) lines.push(`Competición: ${stats.topCompetition.name}`);
  if (stats.peakMonth) {
    lines.push(
      `Mes pico: ${MONTH_NAMES_ES[stats.peakMonth.month - 1]} (${stats.peakMonth.count})`,
    );
  }
  if (stats.topWatchContext) {
    lines.push(`Lo ves más: ${stats.topWatchContext.name}`);
  }
  if (stats.stadiumVisits > 0) {
    lines.push(
      `En el estadio: ${stats.stadiumVisits} partido${stats.stadiumVisits === 1 ? '' : 's'}`,
    );
  }
  if (stats.photosCount > 0) {
    lines.push(`${stats.photosCount} foto${stats.photosCount === 1 ? '' : 's'} en el diario`);
  }
  if (stats.fiveStarCount > 0) {
    lines.push(`5★: ${stats.fiveStarCount}`);
  }
  if (stats.bestRated) {
    lines.push(
      `Mejor partido: ${stats.bestRated.home_team_name} vs ${stats.bestRated.away_team_name}`,
    );
  }
  lines.push('', profileUrl?.trim() || siteUrl());
  return lines.join('\n');
}
