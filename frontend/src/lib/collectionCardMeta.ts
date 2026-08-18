import { formatLikesPanelTitle } from '@/lib/capsuleLikes';
import { formatCommentsCountLabel } from '@/lib/commentsCount';

/** Línea de meta en tarjetas de lista pública (partidos + engagement). */
export function formatCollectionCardMeta(
  itemsCount: number,
  likesCount = 0,
  commentsCount = 0,
): string {
  const parts = [`${itemsCount} ${itemsCount === 1 ? 'partido' : 'partidos'}`];
  if (likesCount > 0) parts.push(formatLikesPanelTitle(likesCount));
  if (commentsCount > 0) parts.push(formatCommentsCountLabel(commentsCount));
  return parts.join(' · ');
}
