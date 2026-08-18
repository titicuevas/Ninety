import { candidateAlsoWatchedIds } from './capsuleAlsoWatched.js';
import { isMissingCommentsTable } from './capsuleComments.js';
import {
  assembleAlsoLikedPeople,
  type CollectionAlsoLikedPerson,
} from './collectionLikes.js';
import { isUuid, onlyUuids } from './postgrestSafe.js';
import { fetchProfilesByIds } from './profileLookup.js';
import { listBlockedEitherWayIds } from './userBlocks.js';
import { getFollowingIds } from './userFollows.js';

/** Nombres que caben en una tarjeta de listado. */
export const CARD_ALSO_FOLLOWED_LIMIT = 3;

function isMissingLikesTable(error: unknown): boolean {
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
  return (
    message.includes('capsule_likes') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find')
  );
}

type FollowedRow = { target_id: string; user_id: string };

/** Agrupa follows por Capsule, sin el dueño, con tope de tarjeta. */
export function groupFollowedUserIdsByTarget(
  rows: FollowedRow[],
  ownerByTarget: ReadonlyMap<string, string>,
  limit = CARD_ALSO_FOLLOWED_LIMIT,
): Map<string, string[]> {
  const acc = new Map<string, string[]>();
  for (const row of rows) {
    const owner = ownerByTarget.get(row.target_id);
    if (!owner || row.user_id === owner) continue;
    const list = acc.get(row.target_id) ?? [];
    if (list.includes(row.user_id) || list.length >= limit) continue;
    list.push(row.user_id);
    acc.set(row.target_id, list);
  }
  return acc;
}

async function loadFollowCandidates(viewerId: string): Promise<string[]> {
  if (!viewerId || !isUuid(viewerId)) return [];
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return [];
  const [followingIds, blockedList] = await Promise.all([
    getFollowingIds(supabaseAdmin, viewerId),
    listBlockedEitherWayIds(viewerId),
  ]);
  return candidateAlsoWatchedIds(followingIds, new Set(blockedList), viewerId);
}

async function peopleByTarget(
  idsByTarget: Map<string, string[]>,
): Promise<Map<string, CollectionAlsoLikedPerson[]>> {
  const userIds = [...new Set([...idsByTarget.values()].flat())];
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin || userIds.length === 0) {
    return new Map([...idsByTarget.keys()].map((id) => [id, []]));
  }
  const profiles = await fetchProfilesByIds(supabaseAdmin, userIds);
  if (profiles.error) throw profiles.error;
  const result = new Map<string, CollectionAlsoLikedPerson[]>();
  for (const [targetId, ids] of idsByTarget) {
    result.set(targetId, assembleAlsoLikedPeople(ids, profiles.rows));
  }
  return result;
}

type SocialItem = { id: string; user_id: string };

export async function attachFollowedField<T extends SocialItem>(
  viewerId: string,
  items: T[],
  field: 'also_liked' | 'also_commented',
  loadRows: (
    candidateIds: string[],
    targetIds: string[],
  ) => Promise<FollowedRow[]>,
  isMissingTable: (error: unknown) => boolean,
): Promise<Array<T & { also_liked?: CollectionAlsoLikedPerson[]; also_commented?: CollectionAlsoLikedPerson[] }>> {
  const empty = items.map((item) => ({ ...item, [field]: [] as CollectionAlsoLikedPerson[] }));
  if (!viewerId || items.length === 0) return empty;

  const candidateIds = onlyUuids(await loadFollowCandidates(viewerId));
  const targetIds = onlyUuids(items.map((item) => item.id));
  if (candidateIds.length === 0 || targetIds.length === 0) return empty;

  let rows: FollowedRow[];
  try {
    rows = await loadRows(candidateIds, targetIds);
  } catch (error) {
    if (isMissingTable(error)) return empty;
    throw error;
  }

  const ownerByTarget = new Map(items.map((item) => [item.id, item.user_id]));
  const idsByTarget = groupFollowedUserIdsByTarget(rows, ownerByTarget);
  const people = await peopleByTarget(idsByTarget);

  return items.map((item) => ({
    ...item,
    [field]: people.get(item.id) ?? [],
  }));
}

/** Adjunta `also_liked` a un listado (un query para toda la página). */
export async function attachAlsoLiked<T extends SocialItem>(
  viewerId: string,
  items: T[],
): Promise<Array<T & { also_liked: CollectionAlsoLikedPerson[] }>> {
  const { supabaseAdmin } = await import('./supabase.js');
  const attached = await attachFollowedField(
    viewerId,
    items,
    'also_liked',
    async (candidateIds, capsuleIds) => {
    if (!supabaseAdmin) return [];
    const { data, error } = await supabaseAdmin
      .from('capsule_likes')
      .select('capsule_id, user_id')
      .in('capsule_id', capsuleIds)
      .in('user_id', candidateIds)
      .limit(Math.min(1000, capsuleIds.length * CARD_ALSO_FOLLOWED_LIMIT * 8));
    if (error) throw error;
    return (data ?? []).map((row) => ({
      target_id: row.capsule_id as string,
      user_id: row.user_id as string,
    }));
  },
    isMissingLikesTable,
  );
  return attached as Array<T & { also_liked: CollectionAlsoLikedPerson[] }>;
}

/** Adjunta `also_commented` a un listado (un query para toda la página). */
export async function attachAlsoCommented<T extends SocialItem>(
  viewerId: string,
  items: T[],
): Promise<Array<T & { also_commented: CollectionAlsoLikedPerson[] }>> {
  const { supabaseAdmin } = await import('./supabase.js');
  const attached = await attachFollowedField(
    viewerId,
    items,
    'also_commented',
    async (candidateIds, capsuleIds) => {
      if (!supabaseAdmin) return [];
      const { data, error } = await supabaseAdmin
        .from('capsule_comments')
        .select('capsule_id, user_id, created_at')
        .in('capsule_id', capsuleIds)
        .in('user_id', candidateIds)
        .order('created_at', { ascending: false })
        .limit(Math.min(1000, capsuleIds.length * CARD_ALSO_FOLLOWED_LIMIT * 8));
      if (error) throw error;
      return (data ?? []).map((row) => ({
        target_id: row.capsule_id as string,
        user_id: row.user_id as string,
      }));
    },
    isMissingCommentsTable,
  );
  return attached as Array<T & { also_commented: CollectionAlsoLikedPerson[] }>;
}
