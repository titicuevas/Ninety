/** Query/orden de Explorar colecciones (`?q=` + `?sort=`). */

export type DiscoverCollectionsSort = 'relevant' | 'recent' | 'likes';

export const DISCOVER_COLLECTIONS_SORT_CHIPS: ReadonlyArray<{
  value: DiscoverCollectionsSort;
  label: string;
}> = [
  { value: 'relevant', label: 'Relevantes' },
  { value: 'recent', label: 'Recientes' },
  { value: 'likes', label: 'Me gusta' },
];

export function parseDiscoverCollectionsSortParam(
  value: string | null,
): DiscoverCollectionsSort {
  if (value === 'recent' || value === 'likes') return value;
  return 'relevant';
}

export function parseDiscoverCollectionsQueryParam(value: string | null): string {
  return (value ?? '').trim().slice(0, 80);
}

export function hasDiscoverCollectionsSearch(q: string, sort: DiscoverCollectionsSort): boolean {
  return q.trim().length > 0 || sort !== 'relevant';
}
