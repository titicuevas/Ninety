import { ALSO_COMMENTED_SCAN, uniqueCommenterIds } from './capsuleAlsoCommented.js';
import { candidateAlsoWatchedIds } from './capsuleAlsoWatched.js';
import {
  collectionCommentsMigrationHint,
  isMissingCollectionCommentsTable,
} from './collectionComments.js';
import {
  assembleAlsoLikedPeople,
  canEngageCollectionLikes,
} from './collectionLikes.js';
import { fetchProfilesByIds } from './profileLookup.js';
import { listBlockedEitherWayIds } from './userBlocks.js';
import { getFollowingIds } from './userFollows.js';

/** Follows del viewer que comentaron esta lista (sin el dueño ni bloqueados). */
export async function listCollectionAlsoCommented(viewerId: string, collectionId: string) {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Comentarios no disponibles'), { status: 503 });
  }

  const { data: collection, error: collectionError } = await supabaseAdmin
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', collectionId)
    .maybeSingle();

  if (collectionError) throw collectionError;
  if (!collection || !canEngageCollectionLikes(collection, viewerId)) {
    throw Object.assign(new Error('Colección no encontrada'), { status: 404 });
  }

  const [followingIds, blockedList] = await Promise.all([
    getFollowingIds(supabaseAdmin, viewerId),
    listBlockedEitherWayIds(viewerId),
  ]);

  const blockedIds = new Set(blockedList);
  if (collection.user_id !== viewerId && blockedIds.has(collection.user_id)) {
    throw Object.assign(new Error('Colección no encontrada'), { status: 404 });
  }

  const candidateIds = candidateAlsoWatchedIds(followingIds, blockedIds, viewerId).filter(
    (id) => id !== collection.user_id,
  );
  if (candidateIds.length === 0) return [];

  const { data: comments, error: commentsError } = await supabaseAdmin
    .from('collection_comments')
    .select('user_id')
    .eq('collection_id', collectionId)
    .in('user_id', candidateIds)
    .order('created_at', { ascending: false })
    .limit(ALSO_COMMENTED_SCAN);

  if (commentsError) {
    if (isMissingCollectionCommentsTable(commentsError)) {
      throw Object.assign(new Error(collectionCommentsMigrationHint()), { status: 503 });
    }
    throw commentsError;
  }

  const userIds = uniqueCommenterIds((comments ?? []) as Array<{ user_id: string }>);
  if (userIds.length === 0) return [];

  const profiles = await fetchProfilesByIds(supabaseAdmin, userIds);
  if (profiles.error) throw profiles.error;

  return assembleAlsoLikedPeople(userIds, profiles.rows);
}
