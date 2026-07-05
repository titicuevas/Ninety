import type { Capsule } from '@/types/capsule';
import type { FootballMatch } from '@/types/football';

export function footballMatchToCapsuleBase(match: FootballMatch) {
  return {
    match_id: match.id,
    match_played_at: match.utcDate ?? null,
    home_team_name: match.homeTeam.name,
    away_team_name: match.awayTeam.name,
    home_team_crest: match.homeTeam.crest ?? null,
    away_team_crest: match.awayTeam.crest ?? null,
    competition_name: match.competition?.name ?? null,
    home_score: match.score?.fullTime?.home ?? null,
    away_score: match.score?.fullTime?.away ?? null,
  };
}

export function defaultWatchedAt(match: FootballMatch) {
  if (match.utcDate) return match.utcDate.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export function capsuleToFootballMatch(capsule: Capsule): FootballMatch {
  return {
    id: capsule.match_id,
    utcDate: capsule.match_played_at ?? undefined,
    homeTeam: {
      name: capsule.home_team_name,
      crest: capsule.home_team_crest ?? undefined,
    },
    awayTeam: {
      name: capsule.away_team_name,
      crest: capsule.away_team_crest ?? undefined,
    },
    score: {
      fullTime: {
        home: capsule.home_score,
        away: capsule.away_score,
      },
    },
    competition: capsule.competition_name ? { name: capsule.competition_name } : undefined,
  };
}
