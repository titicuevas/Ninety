import type { Capsule } from '@/types/capsule';

export interface CapsuleStats {
  totalMatches: number;
  averageRating: number | null;
  ratedCount: number;
  notesCount: number;
  topCompetition: { name: string; count: number } | null;
  topTeam: { name: string; count: number } | null;
  lastWatched: Capsule | null;
  bestRated: Capsule | null;
  recentCapsules: Capsule[];
}

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

  return {
    totalMatches: capsules.length,
    averageRating,
    ratedCount: ratings.length,
    notesCount: capsules.filter((c) => c.note?.trim()).length,
    topCompetition: topEntry(competitionCounts(capsules)),
    topTeam: topEntry(teamCounts(capsules)),
    lastWatched: sortedByWatched[0] ?? null,
    bestRated,
    recentCapsules: sortedByWatched.slice(0, 3),
  };
}

export function formatRating(value: number | null) {
  if (value == null) return '—';
  return value.toFixed(1);
}
