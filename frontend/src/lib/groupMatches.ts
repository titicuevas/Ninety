import type { FootballMatch } from '@/types/football';

export interface MatchGroup {
  key: string;
  label: string;
  matches: FootballMatch[];
}

export function groupMatchesByCompetition(matches: FootballMatch[]): MatchGroup[] {
  const groups = new Map<string, MatchGroup>();

  for (const match of matches) {
    const key = match.competition?.code ?? match.competition?.name ?? 'other';
    const label = match.competition?.name ?? 'Otras competiciones';

    const existing = groups.get(key);
    if (existing) {
      existing.matches.push(match);
    } else {
      groups.set(key, { key, label, matches: [match] });
    }
  }

  return Array.from(groups.values());
}
