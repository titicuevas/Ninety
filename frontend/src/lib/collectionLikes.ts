import {
  LIKES_PAGE_SIZE,
  buildCapsuleLikesQuery,
  formatLikesCountLabel,
  formatLikesPanelTitle,
} from '@/lib/capsuleLikes';

export { LIKES_PAGE_SIZE, formatLikesCountLabel, formatLikesPanelTitle };

/** Query string para paginar likes de una colección. */
export function buildCollectionLikesQuery(offset: number, limit = LIKES_PAGE_SIZE): string {
  return buildCapsuleLikesQuery(offset, limit);
}
