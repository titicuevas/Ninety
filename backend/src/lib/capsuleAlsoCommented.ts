import { candidateAlsoWatchedIds } from './capsuleAlsoWatched.js';
import { isMissingCommentsTable } from './capsuleComments.js';
import { isVisibleLikedCapsule } from './capsuleLikes.js';
import { ALSO_LIKED_LIMIT, assembleAlsoLikedPeople } from './collectionLikes.js';
import { fetchProfilesByIds } from './profileLookup.js';
import { listBlockedEitherWayIds } from './userBlocks.js';
import { getFollowingIds } from './userFollows.js';

export const ALSO_COMMENTED_SCAN = 200;

function commentsMigrationHint(): string {
  return 'Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.';
}

/** Un commenter por persona, tope de filas en la UI. */
export function uniqueCommenterIds(
  rows: Array<{ user_id: string }>,
  limit = ALSO_LIKED_LIMIT,
): string[] {
  return [...new Set(rows.map((row) => row.user_id))].slice(0, limit);
}

/** Follows del viewer que comentaron esta Capsule (sin el dueño ni bloqueados). */
export async function listCapsuleAlsoCommented(viewerId: string, capsuleId: string) {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Comentarios no disponibles'), { status: 503 });
  }

  const { data: capsule, error: capsuleError } = await supabaseAdmin
    .from('capsules')
    .select('id, user_id, is_public')
    .eq('id', capsuleId)
    .maybeSingle();

  if (capsuleError) throw capsuleError;
  if (!capsule) {
    throw Object.assign(new Error('Capsule no encontrada'), { status: 404 });
  }

  const [followingIds, blockedList] = await Promise.all([
    getFollowingIds(supabaseAdmin, viewerId),
    listBlockedEitherWayIds(viewerId),
  ]);

  const blockedIds = new Set(blockedList);
  if (!isVisibleLikedCapsule(capsule, viewerId, blockedIds)) {
    throw Object.assign(new Error('Capsule no encontrada'), { status: 404 });
  }

  const candidateIds = candidateAlsoWatchedIds(followingIds, blockedIds, viewerId).filter(
    (id) => id !== capsule.user_id,
  );
  if (candidateIds.length === 0) return [];

  const { data: comments, error: commentsError } = await supabaseAdmin
    .from('capsule_comments')
    .select('user_id')
    .eq('capsule_id', capsuleId)
    .in('user_id', candidateIds)
    .order('created_at', { ascending: false })
    .limit(ALSO_COMMENTED_SCAN);

  if (commentsError) {
    if (isMissingCommentsTable(commentsError)) {
      throw Object.assign(new Error(commentsMigrationHint()), { status: 503 });
    }
    throw commentsError;
  }

  const userIds = uniqueCommenterIds((comments ?? []) as Array<{ user_id: string }>);
  if (userIds.length === 0) return [];

  const profiles = await fetchProfilesByIds(supabaseAdmin, userIds);
  if (profiles.error) throw profiles.error;

  return assembleAlsoLikedPeople(userIds, profiles.rows);
}
