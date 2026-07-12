export interface Capsule {
  id: string;
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
  watched_at: string;
  rating: number | null;
  note: string | null;
  photo_urls: string[];
  /** @deprecated compatibilidad con datos antiguos */
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCapsuleInput {
  match_id: number;
  match_played_at?: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_crest?: string | null;
  away_team_crest?: string | null;
  competition_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  watched_at: string;
  rating?: number | null;
  note?: string | null;
  photo_urls?: string[];
}

export interface UpdateCapsuleInput {
  watched_at?: string;
  rating?: number | null;
  note?: string | null;
  photo_urls?: string[];
}

export interface CapsulesResponse {
  capsules: Capsule[];
}

export interface CapsuleAuthor {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FeedCapsule extends Capsule {
  profiles: CapsuleAuthor | null;
  likes_count?: number;
  liked_by_me?: boolean;
  comments_count?: number;
}

export interface FeedResponse {
  capsules: FeedCapsule[];
  total: number;
  following_count?: number;
}
