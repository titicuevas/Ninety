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

export type DiscoverCollectionMatchReason = 'following' | 'favorite_team' | 'active' | null;

export type RankedDiscoverCollection = DiscoverCollectionCandidate & {
  match_reason: DiscoverCollectionMatchReason;
};

export type DiscoverCollectionsSort = 'relevant' | 'recent' | 'likes';

export function parseDiscoverCollectionsSort(value: unknown): DiscoverCollectionsSort {
  if (value === 'recent' || value === 'likes') return value;
  return 'relevant';
}

export function matchesDiscoverCollectionQuery(
  row: {
    name: string;
    description: string | null;
    author: { username: string; display_name: string | null };
  },
  q: string,
): boolean {
  const needle = foldDiscoverQuery(q);
  if (!needle) return true;
  const haystack = foldDiscoverQuery(
    [row.name, row.description ?? '', row.author.username, row.author.display_name ?? ''].join(
      ' ',
    ),
  );
  return haystack.includes(needle);
}

function foldDiscoverQuery(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function discoverMatchReason(
  row: DiscoverCollectionCandidate,
  viewer: { favorite_team?: string | null },
  followingIds: Set<string>,
): DiscoverCollectionMatchReason {
  if (followingIds.has(row.user_id)) return 'following';
  if (teamsMatch(viewer.favorite_team, row.author.favorite_team)) return 'favorite_team';
  return 'active';
}

function isDiscoverableCollection(
  row: DiscoverCollectionCandidate,
  viewerId: string,
): boolean {
  return (
    row.user_id !== viewerId &&
    row.is_public &&
    row.items_count > 0 &&
    !!row.author.username
  );
}

/**
 * Ordena colecciones públicas ajenas: seguidos → mismo equipo favorito del autor →
 * con contenido (activas) → con portada → más ítems → más recientes.
 * En frío (sin follows / sin equipo) prioriza listas con Capsules y actividad reciente.
 */
export function rankDiscoverCollections(
  candidates: DiscoverCollectionCandidate[],
  viewer: { id: string; favorite_team?: string | null },
  followingIds: Set<string>,
  limit: number,
): RankedDiscoverCollection[] {
  return candidates
    .filter((row) => isDiscoverableCollection(row, viewer.id))
    .map((row) => {
      const scoreFollowing = followingIds.has(row.user_id) ? 100 : 0;
      const scoreTeam = teamsMatch(viewer.favorite_team, row.author.favorite_team) ? 50 : 0;
      const scoreCover = row.cover_url ? 5 : 0;
      const scoreItems = Math.min(row.items_count, 20);
      const updated = new Date(row.updated_at).getTime();

      return {
        row,
        score: scoreFollowing + scoreTeam + scoreCover + scoreItems,
        updated,
        match_reason: discoverMatchReason(row, viewer, followingIds),
      };
    })
    .sort((a, b) => b.score - a.score || b.updated - a.updated)
    .slice(0, limit)
    .map((entry) => ({ ...entry.row, match_reason: entry.match_reason }));
}

/**
 * Filtra por texto y aplica orden: relevantes (ranking), recientes o me gusta.
 */
export function selectDiscoverCollections(
  candidates: DiscoverCollectionCandidate[],
  viewer: { id: string; favorite_team?: string | null },
  followingIds: Set<string>,
  opts: {
    limit: number;
    q?: string | null;
    sort?: DiscoverCollectionsSort;
    likesCountById?: Map<string, number>;
  },
): RankedDiscoverCollection[] {
  const limit = Math.max(0, opts.limit);
  const sort = opts.sort ?? 'relevant';
  const q = opts.q?.trim() ?? '';

  let pool = candidates.filter((row) => isDiscoverableCollection(row, viewer.id));
  if (q) {
    pool = pool.filter((row) => matchesDiscoverCollectionQuery(row, q));
  }

  if (sort === 'relevant') {
    return rankDiscoverCollections(pool, viewer, followingIds, limit);
  }

  const likesCountById = opts.likesCountById ?? new Map<string, number>();
  return [...pool]
    .map((row) => ({
      ...row,
      match_reason: discoverMatchReason(row, viewer, followingIds),
      _likes: likesCountById.get(row.id) ?? 0,
      _updated: new Date(row.updated_at).getTime(),
    }))
    .sort((a, b) => {
      if (sort === 'likes') {
        return b._likes - a._likes || b._updated - a._updated || a.name.localeCompare(b.name);
      }
      return b._updated - a._updated || a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map(({ _likes: _l, _updated: _u, ...row }) => row);
}
