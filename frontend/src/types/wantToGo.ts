export type WantToGoMatch = {
  user_id: string;
  match_id: number;
  match_played_at: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_crest: string | null;
  away_team_crest: string | null;
  competition_name: string | null;
  home_score: number | null;
  away_score: number | null;
  note: string | null;
  created_at: string;
};

export type WantToGoListResponse = {
  items: WantToGoMatch[];
  total: number;
  limit: number;
  offset: number;
};

export type WantToGoIdsResponse = {
  match_ids: number[];
};

export type AddWantToGoInput = {
  match_id: number;
  match_played_at?: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_crest?: string | null;
  away_team_crest?: string | null;
  competition_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  note?: string | null;
};
