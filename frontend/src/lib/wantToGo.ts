import type { FootballMatch } from '@/types/football';
import type { AddWantToGoInput, WantToGoMatch } from '@/types/wantToGo';
import { footballMatchToCapsuleBase } from '@/lib/matchCapsule';

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
