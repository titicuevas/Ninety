export type FeedScope = 'following' | 'explore';
export type FeedSort = 'recent' | 'popular';

export function parseFeedScope(value: string | null): FeedScope {
  return value === 'explore' ? 'explore' : 'following';
}

export function parseFeedSort(value: string | null): FeedSort {
  return value === 'popular' ? 'popular' : 'recent';
}

/** Query string del feed; omite defaults (following / recent). */
export function feedSearchParams(scope: FeedScope, sort: FeedSort): string {
  const params = new URLSearchParams();
  if (scope !== 'following') params.set('scope', scope);
  if (sort !== 'recent') params.set('sort', sort);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function feedPath(scope: FeedScope = 'following', sort: FeedSort = 'recent'): string {
  return `/feed${feedSearchParams(scope, sort)}`;
}

/** Título corto para pestaña / a11y según alcance y orden. */
export function feedDocumentTitle(scope: FeedScope, sort: FeedSort): string {
  const base = scope === 'explore' ? 'Explorar' : 'Feed';
  return sort === 'popular' ? `${base} · Populares` : base;
}
