import type { SupabaseClient } from '@supabase/supabase-js';
import { type AlsoWatchedPerson } from './capsuleAlsoWatched.js';
import { attachListSocial } from './capsuleListSocial.js';
import { attachCollectionAlsoFollowed } from './collectionAlsoFollowed.js';
import { attachCollectionCommentCounts } from './collectionComments.js';
import { attachCollectionLikeStats, type CollectionAlsoLikedPerson } from './collectionLikes.js';
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
  user_id: string;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  rating: number | null;
  photo_urls: string[] | null;
  watched_at: string | null;
  match_id?: number | null;
  likes_count?: number;
  comments_count?: number;
  also_watched?: AlsoWatchedPerson[];
  also_liked?: CollectionAlsoLikedPerson[];
  also_commented?: CollectionAlsoLikedPerson[];
};

export type FollowActivityCollectionPayload = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  author_username: string | null;
  likes_count?: number;
  comments_count?: number;
  also_liked?: CollectionAlsoLikedPerson[];
  also_commented?: CollectionAlsoLikedPerson[];
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
      type: 'capsule_like';
      occurred_at: string;
      actor: FollowActivityActor;
      capsule: FollowActivityCapsulePayload;
    }
  | {
      id: string;
      type: 'capsule_comment';
      occurred_at: string;
      actor: FollowActivityActor;
      capsule: FollowActivityCapsulePayload;
      comment_body: string;
    }
  | {
      id: string;
      type: 'collection';
      occurred_at: string;
      actor: FollowActivityActor;
      collection: FollowActivityCollectionPayload;
    }
  | {
      id: string;
      type: 'collection_like';
      occurred_at: string;
      actor: FollowActivityActor;
      collection: FollowActivityCollectionPayload;
    }
  | {
      id: string;
      type: 'collection_comment';
      occurred_at: string;
      actor: FollowActivityActor;
      collection: FollowActivityCollectionPayload;
      comment_body: string;
    };

type CapsuleFields = {
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  rating: number | null;
  photo_urls: string[] | null;
  watched_at: string | null;
  match_id?: number | null;
};

type CapsuleCandidate = CapsuleFields & {
  kind: 'capsule';
  id: string;
  user_id: string;
  occurred_at: string;
};

type CapsuleLikeCandidate = CapsuleFields & {
  kind: 'capsule_like';
  id: string;
  user_id: string;
  occurred_at: string;
  capsule_id: string;
  capsule_user_id: string;
};

type CapsuleCommentCandidate = CapsuleFields & {
  kind: 'capsule_comment';
  id: string;
  user_id: string;
  occurred_at: string;
  capsule_id: string;
  capsule_user_id: string;
  comment_body: string;
};

type CollectionCandidate = {
  kind: 'collection';
  id: string;
  user_id: string;
  occurred_at: string;
  name: string;
  slug: string;
  description: string | null;
  author_username: string | null;
};

type CollectionLikeCandidate = {
  kind: 'collection_like';
  id: string;
  user_id: string;
  occurred_at: string;
  collection_id: string;
  name: string;
  slug: string;
  description: string | null;
  author_username: string | null;
};

type CollectionCommentCandidate = {
  kind: 'collection_comment';
  id: string;
  user_id: string;
  occurred_at: string;
  collection_id: string;
  name: string;
  slug: string;
  description: string | null;
  author_username: string | null;
  comment_body: string;
};

export type FollowActivityCandidate =
  | CapsuleCandidate
  | CapsuleLikeCandidate
  | CapsuleCommentCandidate
  | CollectionCandidate
  | CollectionLikeCandidate
  | CollectionCommentCandidate;

export const ACTIVITY_COMMENT_SNIPPET_MAX = 140;

const KIND_RANK: Record<FollowActivityCandidate['kind'], number> = {
  capsule: 0,
  capsule_like: 1,
  capsule_comment: 2,
  collection: 3,
  collection_like: 4,
  collection_comment: 5,
};

function isMissingRelation(error: unknown, table: string): boolean {
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
    (message.includes(table) &&
      (message.includes('schema cache') ||
        message.includes('Could not find') ||
        message.includes('does not exist')))
  );
}

export function followActivityKindRank(kind: FollowActivityCandidate['kind']): number {
  return KIND_RANK[kind];
}

/** Recorte de comentario para la timeline (un renglón). */
export function activityCommentSnippet(
  body: string,
  max = ACTIVITY_COMMENT_SNIPPET_MAX,
): string {
  const trimmed = body.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Mezcla candidatos por fecha (más reciente primero). */
export function mergeFollowActivityCandidates(
  candidates: FollowActivityCandidate[],
): FollowActivityCandidate[] {
  return [...candidates].sort((a, b) => {
    const byTime = b.occurred_at.localeCompare(a.occurred_at);
    if (byTime !== 0) return byTime;
    if (a.kind !== b.kind) return KIND_RANK[a.kind] - KIND_RANK[b.kind];
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

type CapsuleLikeSource = {
  user_id: string;
  capsule_id: string;
  created_at: string;
};

type CapsuleLikeTarget = CapsuleFields & {
  id: string;
  user_id: string;
  is_public?: boolean | null;
};

/** Likes de follows a Capsules públicas ajenas (no bloqueadas). */
export function visibleCapsuleLikeCandidates(
  likes: CapsuleLikeSource[],
  capsulesById: Map<string, CapsuleLikeTarget>,
  blockedIds: ReadonlySet<string>,
  viewerId: string,
): CapsuleLikeCandidate[] {
  const out: CapsuleLikeCandidate[] = [];
  for (const like of likes) {
    const capsule = capsulesById.get(like.capsule_id);
    if (!capsule) continue;
    if (capsule.is_public === false) continue;
    if (capsule.user_id === viewerId) continue;
    if (capsule.user_id !== viewerId && blockedIds.has(capsule.user_id)) continue;
    out.push({
      kind: 'capsule_like',
      id: `${like.user_id}:${capsule.id}`,
      user_id: like.user_id,
      occurred_at: like.created_at,
      capsule_id: capsule.id,
      home_team_name: capsule.home_team_name,
      away_team_name: capsule.away_team_name,
      competition_name: capsule.competition_name,
      rating: capsule.rating,
      photo_urls: capsule.photo_urls,
      watched_at: capsule.watched_at,
      match_id: capsule.match_id ?? null,
      capsule_user_id: capsule.user_id,
    });
  }
  return out;
}

type CollectionLikeSource = {
  user_id: string;
  collection_id: string;
  created_at: string;
};

type CollectionLikeTarget = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public?: boolean | null;
};

/** Likes de follows a listas públicas ajenas (no bloqueadas). */
export function visibleCollectionLikeCandidates(
  likes: CollectionLikeSource[],
  collectionsById: Map<string, CollectionLikeTarget>,
  ownerUsernameById: ReadonlyMap<string, string | null>,
  blockedIds: ReadonlySet<string>,
  viewerId: string,
): CollectionLikeCandidate[] {
  const out: CollectionLikeCandidate[] = [];
  for (const like of likes) {
    const collection = collectionsById.get(like.collection_id);
    if (!collection) continue;
    if (collection.is_public === false) continue;
    if (collection.user_id === viewerId) continue;
    if (blockedIds.has(collection.user_id)) continue;
    out.push({
      kind: 'collection_like',
      id: `${like.user_id}:${collection.id}`,
      user_id: like.user_id,
      occurred_at: like.created_at,
      collection_id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      author_username: ownerUsernameById.get(collection.user_id) ?? null,
    });
  }
  return out;
}

type CapsuleCommentSource = {
  id: string;
  user_id: string;
  capsule_id: string;
  body: string;
  created_at: string;
};

export function visibleCapsuleCommentCandidates(
  comments: CapsuleCommentSource[],
  capsulesById: Map<string, CapsuleLikeTarget>,
  blockedIds: ReadonlySet<string>,
  viewerId: string,
): CapsuleCommentCandidate[] {
  const out: CapsuleCommentCandidate[] = [];
  for (const comment of comments) {
    const capsule = capsulesById.get(comment.capsule_id);
    if (!capsule) continue;
    if (capsule.is_public === false) continue;
    if (capsule.user_id === viewerId) continue;
    if (blockedIds.has(capsule.user_id)) continue;
    out.push({
      kind: 'capsule_comment',
      id: comment.id,
      user_id: comment.user_id,
      occurred_at: comment.created_at,
      capsule_id: capsule.id,
      comment_body: activityCommentSnippet(comment.body),
      home_team_name: capsule.home_team_name,
      away_team_name: capsule.away_team_name,
      competition_name: capsule.competition_name,
      rating: capsule.rating,
      photo_urls: capsule.photo_urls,
      watched_at: capsule.watched_at,
      match_id: capsule.match_id ?? null,
      capsule_user_id: capsule.user_id,
    });
  }
  return out;
}

type CollectionCommentSource = {
  id: string;
  user_id: string;
  collection_id: string;
  body: string;
  created_at: string;
};

export function visibleCollectionCommentCandidates(
  comments: CollectionCommentSource[],
  collectionsById: Map<string, CollectionLikeTarget>,
  ownerUsernameById: ReadonlyMap<string, string | null>,
  blockedIds: ReadonlySet<string>,
  viewerId: string,
): CollectionCommentCandidate[] {
  const out: CollectionCommentCandidate[] = [];
  for (const comment of comments) {
    const collection = collectionsById.get(comment.collection_id);
    if (!collection) continue;
    if (collection.is_public === false) continue;
    if (collection.user_id === viewerId) continue;
    if (blockedIds.has(collection.user_id)) continue;
    out.push({
      kind: 'collection_comment',
      id: comment.id,
      user_id: comment.user_id,
      occurred_at: comment.created_at,
      collection_id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      author_username: ownerUsernameById.get(collection.user_id) ?? null,
      comment_body: activityCommentSnippet(comment.body),
    });
  }
  return out;
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

function capsulePayload(
  candidate: CapsuleCandidate | CapsuleLikeCandidate | CapsuleCommentCandidate,
): FollowActivityCapsulePayload {
  return {
    id:
      candidate.kind === 'capsule_like' || candidate.kind === 'capsule_comment'
        ? candidate.capsule_id
        : candidate.id,
    user_id:
      candidate.kind === 'capsule_like' || candidate.kind === 'capsule_comment'
        ? candidate.capsule_user_id
        : candidate.user_id,
    home_team_name: candidate.home_team_name,
    away_team_name: candidate.away_team_name,
    competition_name: candidate.competition_name,
    rating: candidate.rating,
    photo_urls: candidate.photo_urls,
    watched_at: candidate.watched_at,
    match_id: candidate.match_id ?? null,
  };
}

function toEvent(
  candidate: FollowActivityCandidate,
  actor: FollowActivityActor,
): FollowActivityEvent {
  if (candidate.kind === 'capsule_comment') {
    return {
      id: `${candidate.kind}:${candidate.id}`,
      type: candidate.kind,
      occurred_at: candidate.occurred_at,
      actor,
      capsule: capsulePayload(candidate),
      comment_body: candidate.comment_body,
    };
  }

  if (candidate.kind === 'capsule' || candidate.kind === 'capsule_like') {
    return {
      id: `${candidate.kind}:${candidate.id}`,
      type: candidate.kind,
      occurred_at: candidate.occurred_at,
      actor,
      capsule: capsulePayload(candidate),
    };
  }

  if (candidate.kind === 'collection_comment') {
    return {
      id: `${candidate.kind}:${candidate.id}`,
      type: candidate.kind,
      occurred_at: candidate.occurred_at,
      actor,
      collection: {
        id: candidate.collection_id,
        name: candidate.name,
        slug: candidate.slug,
        description: candidate.description,
        author_username: candidate.author_username ?? actor.username,
      },
      comment_body: candidate.comment_body,
    };
  }

  return {
    id: `${candidate.kind}:${candidate.id}`,
    type: candidate.kind,
    occurred_at: candidate.occurred_at,
    actor,
    collection: {
      id: candidate.kind === 'collection_like' ? candidate.collection_id : candidate.id,
      name: candidate.name,
      slug: candidate.slug,
      description: candidate.description,
      author_username: candidate.author_username ?? actor.username,
    },
  };
}

type ActivityCountStats = { likes_count: number; comments_count: number };
type ActivityCapsuleStats = ActivityCountStats & {
  also_watched?: AlsoWatchedPerson[];
  also_liked?: CollectionAlsoLikedPerson[];
  also_commented?: CollectionAlsoLikedPerson[];
};
type ActivityCollectionStats = ActivityCountStats & {
  also_liked?: CollectionAlsoLikedPerson[];
  also_commented?: CollectionAlsoLikedPerson[];
};

/** Mezcla likes, comentarios y pie social en Capsules y listas de actividad. */
export function applyActivityEngagement(
  events: FollowActivityEvent[],
  capsuleStats: ReadonlyMap<string, ActivityCapsuleStats>,
  collectionStats: ReadonlyMap<string, ActivityCollectionStats>,
): FollowActivityEvent[] {
  return events.map((event) => {
    if ('capsule' in event) {
      const stats = capsuleStats.get(event.capsule.id);
      return stats ? { ...event, capsule: { ...event.capsule, ...stats } } : event;
    }
    const stats = collectionStats.get(event.collection.id);
    return stats ? { ...event, collection: { ...event.collection, ...stats } } : event;
  });
}

async function loadActivityEngagement(
  supabase: SupabaseClient,
  viewerId: string,
  events: FollowActivityEvent[],
): Promise<FollowActivityEvent[]> {
  const capsuleIds = [...new Set(events.flatMap((event) => ('capsule' in event ? [event.capsule.id] : [])))];
  const collectionIds = [
    ...new Set(events.flatMap((event) => ('collection' in event ? [event.collection.id] : []))),
  ];

  const capsuleStats = new Map<string, ActivityCapsuleStats>();
  if (capsuleIds.length > 0) {
    const uniqueCapsules = new Map<
      string,
      { id: string; user_id: string; match_id?: number | null }
    >();
    for (const event of events) {
      if (!('capsule' in event) || uniqueCapsules.has(event.capsule.id)) continue;
      uniqueCapsules.set(event.capsule.id, {
        id: event.capsule.id,
        user_id: event.capsule.user_id,
        match_id: event.capsule.match_id ?? null,
      });
    }

    const withSocial = await attachListSocial(supabase, viewerId, [...uniqueCapsules.values()]);
    for (const row of withSocial) {
      capsuleStats.set(row.id, {
        likes_count: row.likes_count,
        comments_count: row.comments_count,
        also_watched: row.also_watched,
        also_liked: row.also_liked,
        also_commented: row.also_commented,
      });
    }
  }

  const collectionStats = new Map<string, ActivityCollectionStats>();
  if (collectionIds.length > 0) {
    const { data: collectionRows } = await supabase
      .from('collections')
      .select('id, user_id')
      .in('id', collectionIds);
    const owners = (collectionRows ?? []) as Array<{ id: string; user_id: string }>;
    const withLikes = await attachCollectionLikeStats(
      supabase,
      viewerId,
      collectionIds.map((id) => ({ id })),
    );
    const withComments = await attachCollectionCommentCounts(supabase, withLikes);
    const withFollowed = await attachCollectionAlsoFollowed(viewerId, owners);
    const followedById = new Map(withFollowed.map((row) => [row.id, row]));
    for (const row of withComments) {
      const followed = followedById.get(row.id);
      collectionStats.set(row.id, {
        likes_count: row.likes_count,
        comments_count: row.comments_count,
        also_liked: followed?.also_liked ?? [],
        also_commented: followed?.also_commented ?? [],
      });
    }
  }

  return applyActivityEngagement(events, capsuleStats, collectionStats);
}

async function loadCapsuleLikeCandidates(
  supabase: SupabaseClient,
  authorIds: string[],
  blockedIds: ReadonlySet<string>,
  viewerId: string,
  poolSize: number,
): Promise<{ rows: CapsuleLikeCandidate[]; total: number }> {
  const { data, error, count } = await supabase
    .from('capsule_likes')
    .select('user_id, capsule_id, created_at', { count: 'exact' })
    .in('user_id', authorIds)
    .order('created_at', { ascending: false })
    .range(0, poolSize - 1);

  if (error) {
    if (isMissingRelation(error, 'capsule_likes')) return { rows: [], total: 0 };
    throw error;
  }

  const likes = (data ?? []) as CapsuleLikeSource[];
  const total = count ?? likes.length;
  if (likes.length === 0) return { rows: [], total };

  const capsuleIds = [...new Set(likes.map((row) => row.capsule_id))];
  const { data: capsuleRows, error: capsulesError } = await supabase
    .from('capsules')
    .select(
      'id, user_id, is_public, home_team_name, away_team_name, competition_name, rating, photo_urls, watched_at, match_id',
    )
    .in('id', capsuleIds);

  if (capsulesError) throw capsulesError;

  const capsulesById = new Map(
    ((capsuleRows ?? []) as CapsuleLikeTarget[]).map((row) => [row.id, row]),
  );
  return {
    rows: visibleCapsuleLikeCandidates(likes, capsulesById, blockedIds, viewerId),
    total,
  };
}

async function loadCollectionLikeCandidates(
  supabase: SupabaseClient,
  authorIds: string[],
  blockedIds: ReadonlySet<string>,
  viewerId: string,
  poolSize: number,
): Promise<{ rows: CollectionLikeCandidate[]; total: number }> {
  const { data, error, count } = await supabase
    .from('collection_likes')
    .select('user_id, collection_id, created_at', { count: 'exact' })
    .in('user_id', authorIds)
    .order('created_at', { ascending: false })
    .range(0, poolSize - 1);

  if (error) {
    if (isMissingRelation(error, 'collection_likes')) return { rows: [], total: 0 };
    throw error;
  }

  const likes = (data ?? []) as CollectionLikeSource[];
  const total = count ?? likes.length;
  if (likes.length === 0) return { rows: [], total };

  const collectionIds = [...new Set(likes.map((row) => row.collection_id))];
  const { data: collectionRows, error: collectionsError } = await supabase
    .from('collections')
    .select('id, user_id, name, slug, description, is_public')
    .in('id', collectionIds);

  if (collectionsError) {
    if (isMissingRelation(collectionsError, 'collections')) return { rows: [], total: 0 };
    throw collectionsError;
  }

  const collections = (collectionRows ?? []) as CollectionLikeTarget[];
  const collectionsById = new Map(collections.map((row) => [row.id, row]));
  const ownerIds = [...new Set(collections.map((row) => row.user_id))];
  const ownerUsernameById = new Map<string, string | null>();

  if (ownerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', ownerIds);
    if (profilesError) throw profilesError;
    for (const profile of profiles ?? []) {
      ownerUsernameById.set(profile.id as string, (profile.username as string | null) ?? null);
    }
  }

  return {
    rows: visibleCollectionLikeCandidates(
      likes,
      collectionsById,
      ownerUsernameById,
      blockedIds,
      viewerId,
    ),
    total,
  };
}

async function loadCapsuleCommentCandidates(
  supabase: SupabaseClient,
  authorIds: string[],
  blockedIds: ReadonlySet<string>,
  viewerId: string,
  poolSize: number,
): Promise<{ rows: CapsuleCommentCandidate[]; total: number }> {
  const { data, error, count } = await supabase
    .from('capsule_comments')
    .select('id, user_id, capsule_id, body, created_at', { count: 'exact' })
    .in('user_id', authorIds)
    .order('created_at', { ascending: false })
    .range(0, poolSize - 1);

  if (error) {
    if (isMissingRelation(error, 'capsule_comments')) return { rows: [], total: 0 };
    throw error;
  }

  const comments = (data ?? []) as CapsuleCommentSource[];
  const total = count ?? comments.length;
  if (comments.length === 0) return { rows: [], total };

  const capsuleIds = [...new Set(comments.map((row) => row.capsule_id))];
  const { data: capsuleRows, error: capsulesError } = await supabase
    .from('capsules')
    .select(
      'id, user_id, is_public, home_team_name, away_team_name, competition_name, rating, photo_urls, watched_at, match_id',
    )
    .in('id', capsuleIds);

  if (capsulesError) throw capsulesError;

  const capsulesById = new Map(
    ((capsuleRows ?? []) as CapsuleLikeTarget[]).map((row) => [row.id, row]),
  );
  return {
    rows: visibleCapsuleCommentCandidates(comments, capsulesById, blockedIds, viewerId),
    total,
  };
}

async function loadCollectionCommentCandidates(
  supabase: SupabaseClient,
  authorIds: string[],
  blockedIds: ReadonlySet<string>,
  viewerId: string,
  poolSize: number,
): Promise<{ rows: CollectionCommentCandidate[]; total: number }> {
  const { data, error, count } = await supabase
    .from('collection_comments')
    .select('id, user_id, collection_id, body, created_at', { count: 'exact' })
    .in('user_id', authorIds)
    .order('created_at', { ascending: false })
    .range(0, poolSize - 1);

  if (error) {
    if (isMissingRelation(error, 'collection_comments')) return { rows: [], total: 0 };
    throw error;
  }

  const comments = (data ?? []) as CollectionCommentSource[];
  const total = count ?? comments.length;
  if (comments.length === 0) return { rows: [], total };

  const collectionIds = [...new Set(comments.map((row) => row.collection_id))];
  const { data: collectionRows, error: collectionsError } = await supabase
    .from('collections')
    .select('id, user_id, name, slug, description, is_public')
    .in('id', collectionIds);

  if (collectionsError) {
    if (isMissingRelation(collectionsError, 'collections')) return { rows: [], total: 0 };
    throw collectionsError;
  }

  const collections = (collectionRows ?? []) as CollectionLikeTarget[];
  const collectionsById = new Map(collections.map((row) => [row.id, row]));
  const ownerIds = [...new Set(collections.map((row) => row.user_id))];
  const ownerUsernameById = new Map<string, string | null>();

  if (ownerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', ownerIds);
    if (profilesError) throw profilesError;
    for (const profile of profiles ?? []) {
      ownerUsernameById.set(profile.id as string, (profile.username as string | null) ?? null);
    }
  }

  return {
    rows: visibleCollectionCommentCandidates(
      comments,
      collectionsById,
      ownerUsernameById,
      blockedIds,
      viewerId,
    ),
    total,
  };
}

/**
 * Timeline ligera de gente que sigues: Capsules, listas, me gusta y comentarios públicos.
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

  const blockedIds = new Set(blockedList);
  const authorIds = excludeBlockedIds(followingIds, blockedIds);
  if (authorIds.length === 0) {
    return { events: [], total: 0, following_count: followingIds.length };
  }

  const poolSize = Math.max(offset + limit, 1);
  const wantCapsules = typeFilter !== 'collection';
  const wantCollections = typeFilter !== 'capsule';

  const [
    capsulesResult,
    collectionsResult,
    capsuleLikesResult,
    collectionLikesResult,
    capsuleCommentsResult,
    collectionCommentsResult,
  ] = await Promise.all([
      wantCapsules
        ? supabase
            .from('capsules')
            .select(
              'id, user_id, home_team_name, away_team_name, competition_name, rating, photo_urls, watched_at, match_id, created_at',
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
      wantCapsules
        ? loadCapsuleLikeCandidates(supabase, authorIds, blockedIds, viewerId, poolSize)
        : Promise.resolve({ rows: [] as CapsuleLikeCandidate[], total: 0 }),
      wantCollections
        ? loadCollectionLikeCandidates(supabase, authorIds, blockedIds, viewerId, poolSize)
        : Promise.resolve({ rows: [] as CollectionLikeCandidate[], total: 0 }),
      wantCapsules
        ? loadCapsuleCommentCandidates(supabase, authorIds, blockedIds, viewerId, poolSize)
        : Promise.resolve({ rows: [] as CapsuleCommentCandidate[], total: 0 }),
      wantCollections
        ? loadCollectionCommentCandidates(supabase, authorIds, blockedIds, viewerId, poolSize)
        : Promise.resolve({ rows: [] as CollectionCommentCandidate[], total: 0 }),
    ]);

  if (capsulesResult.error) throw capsulesResult.error;

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
    if (!isMissingRelation(collectionsResult.error, 'collections')) {
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
    match_id: number | null;
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
        match_id: row.match_id,
      }),
    ),
    ...capsuleLikesResult.rows,
    ...capsuleCommentsResult.rows,
    ...collectionRows.map(
      (row): CollectionCandidate => ({
        kind: 'collection',
        id: row.id,
        user_id: row.user_id,
        occurred_at: row.created_at,
        name: row.name,
        slug: row.slug,
        description: row.description,
        author_username: null,
      }),
    ),
    ...collectionLikesResult.rows,
    ...collectionCommentsResult.rows,
  ];

  const merged = mergeFollowActivityCandidates(candidates);
  const page = paginateFollowActivity(merged, offset, limit);
  const total =
    typeFilter === 'capsule'
      ? capsuleTotal + capsuleLikesResult.total + capsuleCommentsResult.total
      : typeFilter === 'collection'
        ? collectionTotal + collectionLikesResult.total + collectionCommentsResult.total
        : capsuleTotal +
          collectionTotal +
          capsuleLikesResult.total +
          collectionLikesResult.total +
          capsuleCommentsResult.total +
          collectionCommentsResult.total;

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

  const events = await loadActivityEngagement(
    supabase,
    viewerId,
    page.map((candidate) =>
      toEvent(candidate, toActor(profileMap.get(candidate.user_id), candidate.user_id)),
    ),
  );

  return {
    events,
    total,
    following_count: followingIds.length,
  };
}
