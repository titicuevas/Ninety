import { teamsMatch } from './discoverProfiles.js';

export type DiscoverCollectionAuthor = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  favorite_team?: string | null;
};

export type DiscoverCollectionCandidate = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  cover_capsule_id?: string | null;
  created_at: string;
  updated_at: string;
  items_count: number;
  cover_url?: string | null;
  author: DiscoverCollectionAuthor;
};

export type DiscoverCollectionMatchReason = 'following' | 'favorite_team' | null;

export type RankedDiscoverCollection = DiscoverCollectionCandidate & {
  match_reason: DiscoverCollectionMatchReason;
};

/**
 * Ordena colecciones públicas ajenas: seguidos → mismo equipo favorito del autor →
 * con portada → más ítems → más recientes.
 */
export function rankDiscoverCollections(
  candidates: DiscoverCollectionCandidate[],
  viewer: { id: string; favorite_team?: string | null },
  followingIds: Set<string>,
  limit: number,
): RankedDiscoverCollection[] {
  return candidates
    .filter(
      (row) =>
        row.user_id !== viewer.id &&
        row.is_public &&
        row.items_count > 0 &&
        !!row.author.username,
    )
    .map((row) => {
      const scoreFollowing = followingIds.has(row.user_id) ? 100 : 0;
      const scoreTeam = teamsMatch(viewer.favorite_team, row.author.favorite_team) ? 50 : 0;
      const scoreCover = row.cover_url ? 5 : 0;
      const scoreItems = Math.min(row.items_count, 20);
      const updated = new Date(row.updated_at).getTime();

      const match_reason: DiscoverCollectionMatchReason = scoreFollowing
        ? 'following'
        : scoreTeam
          ? 'favorite_team'
          : null;

      return {
        row,
        score: scoreFollowing + scoreTeam + scoreCover + scoreItems,
        updated,
        match_reason,
      };
    })
    .sort((a, b) => b.score - a.score || b.updated - a.updated)
    .slice(0, limit)
    .map((entry) => ({ ...entry.row, match_reason: entry.match_reason }));
}
