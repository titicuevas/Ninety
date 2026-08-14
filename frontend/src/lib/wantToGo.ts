import type { FootballMatch } from '@/types/football';
import type { AddWantToGoInput, WantToGoMatch } from '@/types/wantToGo';
import { footballMatchToCapsuleBase } from '@/lib/matchCapsule';

export type WantToGoWhenFilter = 'all' | 'upcoming' | 'played';

export const WANT_TO_GO_WHEN_CHIPS: ReadonlyArray<{
  value: WantToGoWhenFilter;
  label: string;
}> = [
  { value: 'all', label: 'Todos' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'played', label: 'Ya jugados' },
];

export function parseWantToGoWhenParam(value: string | null): WantToGoWhenFilter {
  if (!value) return 'all';
  const v = value.trim().toLowerCase();
  if (v === 'upcoming' || v === 'played') return v;
  return 'all';
}

export function wantToGoDocumentTitle(when: WantToGoWhenFilter): string {
  if (when === 'upcoming') return 'Quiero ir · Próximos';
  if (when === 'played') return 'Quiero ir · Ya jugados';
  return 'Quiero ir';
}

/** Kickoff en el pasado. Sin fecha → se queda en próximos. */
export function isWantToGoMatchPlayed(
  matchPlayedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (matchPlayedAt == null || matchPlayedAt === '') return false;
  const kickoffMs = Date.parse(matchPlayedAt);
  if (Number.isNaN(kickoffMs)) return false;
  return kickoffMs < now.getTime();
}

function kickoffMs(playedAt: string | null): number | null {
  if (!playedAt) return null;
  const ms = Date.parse(playedAt);
  return Number.isNaN(ms) ? null : ms;
}

export function partitionWantToGoMatches<T extends { match_played_at: string | null }>(
  items: T[],
  now: Date = new Date(),
): { upcoming: T[]; played: T[] } {
  const upcoming: T[] = [];
  const played: T[] = [];
  for (const item of items) {
    if (isWantToGoMatchPlayed(item.match_played_at, now)) played.push(item);
    else upcoming.push(item);
  }

  upcoming.sort((a, b) => {
    const am = kickoffMs(a.match_played_at);
    const bm = kickoffMs(b.match_played_at);
    if (am == null && bm == null) return 0;
    if (am == null) return 1;
    if (bm == null) return -1;
    return am - bm;
  });
  played.sort((a, b) => (kickoffMs(b.match_played_at) ?? 0) - (kickoffMs(a.match_played_at) ?? 0));

  return { upcoming, played };
}

export function playedWantToGoWithoutCapsule<T extends { match_id: number; match_played_at: string | null }>(
  items: T[],
  capsuleMatchIds: ReadonlySet<number>,
  now: Date = new Date(),
): T[] {
  return partitionWantToGoMatches(items, now).played.filter(
    (item) => !capsuleMatchIds.has(item.match_id),
  );
}

export function footballMatchToWantToGoInput(match: FootballMatch): AddWantToGoInput {
  return footballMatchToCapsuleBase(match);
}

export function wantToGoToFootballMatch(item: WantToGoMatch): FootballMatch {
  return {
    id: item.match_id,
    utcDate: item.match_played_at ?? undefined,
    homeTeam: {
      name: item.home_team_name,
      crest: item.home_team_crest ?? undefined,
    },
    awayTeam: {
      name: item.away_team_name,
      crest: item.away_team_crest ?? undefined,
    },
    score: {
      fullTime: {
        home: item.home_score,
        away: item.away_score,
      },
    },
    competition: item.competition_name ? { name: item.competition_name } : undefined,
  };
}

export function wantToGoButtonLabel(options: {
  saved?: boolean;
  busy?: boolean;
}): string {
  if (options.busy) return 'Guardando…';
  if (options.saved) return 'En Quiero ir';
  return 'Quiero ir';
}
