import type { SupabaseClient } from '@supabase/supabase-js';
import { excludeBlockedIds, listBlockedEitherWayIds } from './userBlocks.js';
import { getFollowingIds } from './userFollows.js';

export type FollowActivityActor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type FollowActivityCapsulePayload = {
  id: string;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  rating: number | null;
  photo_urls: string[] | null;
  watched_at: string | null;
};

export type FollowActivityCollectionPayload = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type FollowActivityEvent =
  | {
      id: string;
      type: 'capsule';
      occurred_at: string;
      actor: FollowActivityActor;
      capsule: FollowActivityCapsulePayload;
    }
  | {
      id: string;
      type: 'collection';
      occurred_at: string;
      actor: FollowActivityActor;
      collection: FollowActivityCollectionPayload;
    };

type CapsuleCandidate = {
  kind: 'capsule';
  id: string;
  user_id: string;
  occurred_at: string;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  rating: number | null;
  photo_urls: string[] | null;
  watched_at: string | null;
};

type CollectionCandidate = {
  kind: 'collection';
  id: string;
  user_id: string;
  occurred_at: string;
  name: string;
  slug: string;
  description: string | null;
};

export type FollowActivityCandidate = CapsuleCandidate | CollectionCandidate;

function isMissingCollectionsTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';

  return (
    code === '42P01' ||
    (message.includes('collections') &&
      (message.includes('schema cache') ||
        message.includes('Could not find') ||
        message.includes('does not exist')))
  );
}

/** Mezcla candidatos de Capsules y colecciones por fecha (más reciente primero). */
export function mergeFollowActivityCandidates(
  candidates: FollowActivityCandidate[],
): FollowActivityCandidate[] {
  return [...candidates].sort((a, b) => {
    const byTime = b.occurred_at.localeCompare(a.occurred_at);
    if (byTime !== 0) return byTime;
    if (a.kind !== b.kind) return a.kind === 'capsule' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

/** Paginación offset/limit sobre la timeline ya ordenada. */
export function paginateFollowActivity<T>(
  items: T[],
  offset: number,
  limit: number,
): T[] {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(0, limit);
  return items.slice(safeOffset, safeOffset + safeLimit);
}

function toActor(
  profile: {
    id: string;
    username: string | null;
    full_name?: string | null;
    avatar_url: string | null;
  } | undefined,
  userId: string,
): FollowActivityActor {
  if (!profile) {
    return { id: userId, username: null, display_name: null, avatar_url: null };
  }
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.full_name ?? null,
    avatar_url: profile.avatar_url,
  };
}

function toEvent(
  candidate: FollowActivityCandidate,
  actor: FollowActivityActor,
): FollowActivityEvent {
  if (candidate.kind === 'capsule') {
    return {
      id: `capsule:${candidate.id}`,
      type: 'capsule',
      occurred_at: candidate.occurred_at,
      actor,
      capsule: {
        id: candidate.id,
        home_team_name: candidate.home_team_name,
        away_team_name: candidate.away_team_name,
        competition_name: candidate.competition_name,
        rating: candidate.rating,
        photo_urls: candidate.photo_urls,
        watched_at: candidate.watched_at,
      },
    };
  }

  return {
    id: `collection:${candidate.id}`,
    type: 'collection',
    occurred_at: candidate.occurred_at,
    actor,
    collection: {
      id: candidate.id,
      name: candidate.name,
      slug: candidate.slug,
      description: candidate.description,
    },
  };
}

/**
 * Timeline ligera de gente que sigues: Capsules y colecciones públicas nuevas.
 * Sin tabla de eventos — consulta fuentes existentes + filtra blocks.
 */
export async function listFollowActivity(
  supabase: SupabaseClient,
  viewerId: string,
  opts: { limit: number; offset: number; type?: 'capsule' | 'collection' | null },
): Promise<{
  events: FollowActivityEvent[];
  total: number;
  following_count: number;
}> {
  const limit = Math.min(Math.max(opts.limit, 1), 50);
  const offset = Math.max(opts.offset, 0);
  const typeFilter = opts.type === 'capsule' || opts.type === 'collection' ? opts.type : null;

  const [followingIds, blockedList] = await Promise.all([
    getFollowingIds(supabase, viewerId),
    listBlockedEitherWayIds(viewerId),
  ]);

  if (followingIds === null || followingIds.length === 0) {
    return { events: [], total: 0, following_count: followingIds?.length ?? 0 };
  }

  const authorIds = excludeBlockedIds(followingIds, new Set(blockedList));
  if (authorIds.length === 0) {
    return { events: [], total: 0, following_count: followingIds.length };
  }

  const poolSize = Math.max(offset + limit, 1);
  const wantCapsules = typeFilter !== 'collection';
  const wantCollections = typeFilter !== 'capsule';

  const [capsulesResult, collectionsResult] = await Promise.all([
    wantCapsules
      ? supabase
          .from('capsules')
          .select(
            'id, user_id, home_team_name, away_team_name, competition_name, rating, photo_urls, watched_at, created_at',
            { count: 'exact' },
          )
          .eq('is_public', true)
          .in('user_id', authorIds)
          .order('created_at', { ascending: false })
          .range(0, poolSize - 1)
      : Promise.resolve({ data: [], error: null, count: 0 }),
    wantCollections
      ? supabase
          .from('collections')
          .select('id, user_id, name, slug, description, created_at', { count: 'exact' })
          .eq('is_public', true)
          .in('user_id', authorIds)
          .order('created_at', { ascending: false })
          .range(0, poolSize - 1)
      : Promise.resolve({ data: [], error: null, count: 0 }),
  ]);

  if (capsulesResult.error) {
    throw capsulesResult.error;
  }

  let collectionRows: Array<{
    id: string;
    user_id: string;
    name: string;
    slug: string;
    description: string | null;
    created_at: string;
  }> = [];
  let collectionTotal = 0;

  if (collectionsResult.error) {
    if (!isMissingCollectionsTable(collectionsResult.error)) {
      throw collectionsResult.error;
    }
  } else {
    collectionRows = (collectionsResult.data ?? []) as typeof collectionRows;
    collectionTotal = collectionsResult.count ?? collectionRows.length;
  }

  const capsuleRows = (capsulesResult.data ?? []) as Array<{
    id: string;
    user_id: string;
    home_team_name: string;
    away_team_name: string;
    competition_name: string | null;
    rating: number | null;
    photo_urls: string[] | null;
    watched_at: string | null;
    created_at: string;
  }>;
  const capsuleTotal = capsulesResult.count ?? capsuleRows.length;

  const candidates: FollowActivityCandidate[] = [
    ...capsuleRows.map(
      (row): CapsuleCandidate => ({
        kind: 'capsule',
        id: row.id,
        user_id: row.user_id,
        occurred_at: row.created_at,
        home_team_name: row.home_team_name,
        away_team_name: row.away_team_name,
        competition_name: row.competition_name,
        rating: row.rating,
        photo_urls: row.photo_urls,
        watched_at: row.watched_at,
      }),
    ),
    ...collectionRows.map(
      (row): CollectionCandidate => ({
        kind: 'collection',
        id: row.id,
        user_id: row.user_id,
        occurred_at: row.created_at,
        name: row.name,
        slug: row.slug,
        description: row.description,
      }),
    ),
  ];

  const merged = mergeFollowActivityCandidates(candidates);
  const page = paginateFollowActivity(merged, offset, limit);
  const total =
    typeFilter === 'capsule'
      ? capsuleTotal
      : typeFilter === 'collection'
        ? collectionTotal
        : capsuleTotal + collectionTotal;

  const userIds = [...new Set(page.map((row) => row.user_id))];
  const profileMap = new Map<
    string,
    { id: string; username: string | null; full_name: string | null; avatar_url: string | null }
  >();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name ?? null,
        avatar_url: profile.avatar_url,
      });
    }
  }

  const events = page.map((candidate) =>
    toEvent(candidate, toActor(profileMap.get(candidate.user_id), candidate.user_id)),
  );

  return {
    events,
    total,
    following_count: followingIds.length,
  };
}
