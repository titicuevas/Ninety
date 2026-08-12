import type { DiscoverCollectionMatchReason } from '@/types/collection';

export function discoverCollectionMatchLabel(
  reason: DiscoverCollectionMatchReason,
): string | null {
  if (reason === 'following') return 'Siguiendo';
  if (reason === 'favorite_team') return 'Mismo equipo';
  return null;
}
