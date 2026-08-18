import type { SupabaseClient } from '@supabase/supabase-js';
import { attachAlsoCommented, attachAlsoLiked } from './capsuleAlsoFollowed.js';
import { attachAlsoWatched } from './capsuleAlsoWatched.js';
import { attachCommentCounts } from './capsuleComments.js';
import { attachLikeStats } from './capsuleLikes.js';

/** Likes, comentarios, also_watched / liked / commented (un query extra por tipo). */
export async function attachListSocial<T extends { id: string; user_id: string; match_id?: number | null }>(
  supabase: SupabaseClient,
  viewerId: string,
  items: T[],
) {
  const withCounts = await attachCommentCounts(
    supabase,
    await attachLikeStats(supabase, viewerId, items),
  );
  const withWatched = await attachAlsoWatched(viewerId, withCounts);
  const withLiked = await attachAlsoLiked(viewerId, withWatched);
  return attachAlsoCommented(viewerId, withLiked);
}
