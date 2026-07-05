export interface FootballTeam {
  id?: number;
  name: string;
  shortName?: string;
  crest?: string;
}

export interface FootballMatch {
  id: number;
  utcDate?: string;
  status?: string;
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
  score?: {
    fullTime?: { home: number | null; away: number | null };
  };
  competition?: {
    id?: number;
    name?: string;
    code?: string;
  };
}

export interface MatchSearchResponse {
  matches: FootballMatch[];
}

export interface CuratedCompetition {
  code: string;
  name: string;
  group: string;
  groupLabel: string;
  apiId?: number;
  teamSearchOnly?: boolean;
  defaultSeason?: number;
  seasons?: number[];
}

export interface CuratedCompetitionsResponse {
  competitions: CuratedCompetition[];
}
