export interface CapsuleLikerProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followed_by_me: boolean;
  follows_me?: boolean;
}

export interface CapsuleLikeRow {
  user_id: string;
  created_at: string;
  profile: CapsuleLikerProfile | null;
}

export interface CapsuleLikesResponse {
  likes: CapsuleLikeRow[];
  total: number;
}
