export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  favorite_team: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  created_at: string;
  updated_at?: string;
}

export interface UpdateProfileInput {
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  favorite_team?: string | null;
  country?: string | null;
  city?: string | null;
}
