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
  followers_count?: number;
  following_count?: number;
  followed_by_me?: boolean;
  /** true si este perfil sigue al viewer autenticado. */
  follows_me?: boolean;
  /** true si el viewer silenció alertas de este perfil. */
  muted_by_me?: boolean;
  /** Motivo de sugerencia en discover (si aplica). */
  match_reason?: 'favorite_team' | 'city' | 'country' | null;
}

export interface UpdateProfileInput {
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  favorite_team?: string | null;
  country?: string | null;
  city?: string | null;
  bio?: string | null;
}
