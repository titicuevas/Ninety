import {
  attachFollowedField,
  CARD_ALSO_FOLLOWED_LIMIT,
} from './capsuleAlsoFollowed.js';
import { isMissingCollectionCommentsTable } from './collectionComments.js';
import {
  isMissingCollectionLikesTable,
  type CollectionAlsoLikedPerson,
} from './collectionLikes.js';

type CollectionSocialItem = { id: string; user_id: string };

/** Adjunta `also_liked` de follows a un listado de listas (un query por página). */
export async function attachCollectionAlsoLiked<T extends CollectionSocialItem>(
  viewerId: string,
  items: T[],
): Promise<Array<T & { also_liked: CollectionAlsoLikedPerson[] }>> {
  const { supabaseAdmin } = await import('./supabase.js');
  const attached = await attachFollowedField(
    viewerId,
    items,
    'also_liked',
    async (candidateIds, collectionIds) => {
      if (!supabaseAdmin) return [];
      const { data, error } = await supabaseAdmin
        .from('collection_likes')
        .select('collection_id, user_id')
        .in('collection_id', collectionIds)
        .in('user_id', candidateIds)
        .limit(Math.min(1000, collectionIds.length * CARD_ALSO_FOLLOWED_LIMIT * 8));
      if (error) throw error;
      return (data ?? []).map((row) => ({
        target_id: row.collection_id as string,
        user_id: row.user_id as string,
      }));
    },
    isMissingCollectionLikesTable,
  );
  return attached as Array<T & { also_liked: CollectionAlsoLikedPerson[] }>;
}

/** Adjunta `also_commented` de follows a un listado de listas (un query por página). */
export async function attachCollectionAlsoCommented<T extends CollectionSocialItem>(
  viewerId: string,
  items: T[],
): Promise<Array<T & { also_commented: CollectionAlsoLikedPerson[] }>> {
  const { supabaseAdmin } = await import('./supabase.js');
  const attached = await attachFollowedField(
    viewerId,
    items,
    'also_commented',
    async (candidateIds, collectionIds) => {
      if (!supabaseAdmin) return [];
      const { data, error } = await supabaseAdmin
        .from('collection_comments')
        .select('collection_id, user_id, created_at')
        .in('collection_id', collectionIds)
        .in('user_id', candidateIds)
        .order('created_at', { ascending: false })
        .limit(Math.min(1000, collectionIds.length * CARD_ALSO_FOLLOWED_LIMIT * 8));
      if (error) throw error;
      return (data ?? []).map((row) => ({
        target_id: row.collection_id as string,
        user_id: row.user_id as string,
      }));
    },
    isMissingCollectionCommentsTable,
  );
  return attached as Array<T & { also_commented: CollectionAlsoLikedPerson[] }>;
}

export async function attachCollectionAlsoFollowed<T extends CollectionSocialItem>(
  viewerId: string,
  items: T[],
): Promise<Array<T & { also_liked: CollectionAlsoLikedPerson[]; also_commented: CollectionAlsoLikedPerson[] }>> {
  const withLiked = await attachCollectionAlsoLiked(viewerId, items);
  return attachCollectionAlsoCommented(viewerId, withLiked);
}
