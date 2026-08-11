export type FeedScope = 'following' | 'explore';
export type FeedSort = 'recent' | 'popular';

export type FeedContentFilters = {
  photosOnly: boolean;
  /** Valor de query para ilike (p. ej. "La Liga"); vacío = sin filtro. */
  competition: string;
};

/** Chips de competición en el feed (value = patrón enviado a la API). */
export const FEED_COMPETITION_CHIPS = [
  { value: 'La Liga', label: 'La Liga' },
  { value: 'Premier League', label: 'Premier' },
  { value: 'Champions', label: 'Champions' },
  { value: 'Serie A', label: 'Serie A' },
  { value: 'Bundesliga', label: 'Bundesliga' },
  { value: 'European Championship', label: 'Euro' },
  { value: 'World Cup', label: 'Mundial' },
] as const;

export function parseFeedScope(value: string | null): FeedScope {
  return value === 'explore' ? 'explore' : 'following';
}

export function parseFeedSort(value: string | null): FeedSort {
  return value === 'popular' ? 'popular' : 'recent';
}

export function parseFeedPhotos(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Competición desde URL; max 100 chars, sin comodines. */
export function parseFeedCompetition(value: string | null): string {
  if (!value) return '';
  const cleaned = value.replace(/[%_,.()"]/g, '').trim().slice(0, 100);
  return cleaned.length >= 2 ? cleaned : '';
}

export function hasFeedContentFilters(content: FeedContentFilters): boolean {
  return content.photosOnly || content.competition.length >= 2;
}

/** Query string del feed; omite defaults (following / recent / sin filtros). */
export function feedSearchParams(
  scope: FeedScope,
  sort: FeedSort,
  content: FeedContentFilters = { photosOnly: false, competition: '' },
): string {
  const params = new URLSearchParams();
  if (scope !== 'following') params.set('scope', scope);
  if (sort !== 'recent') params.set('sort', sort);
  if (content.photosOnly) params.set('photos', '1');
  if (content.competition.length >= 2) params.set('competition', content.competition);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function feedPath(
  scope: FeedScope = 'following',
  sort: FeedSort = 'recent',
  content: FeedContentFilters = { photosOnly: false, competition: '' },
): string {
  return `/feed${feedSearchParams(scope, sort, content)}`;
}

/** Título corto para pestaña / a11y según alcance, orden y filtros. */
export function feedDocumentTitle(
  scope: FeedScope,
  sort: FeedSort,
  content: FeedContentFilters = { photosOnly: false, competition: '' },
): string {
  const base = scope === 'explore' ? 'Explorar' : 'Feed';
  const parts = [sort === 'popular' ? `${base} · Populares` : base];
  if (content.competition) parts.push(content.competition);
  if (content.photosOnly) parts.push('Fotos');
  return parts.length === 1 ? parts[0]! : parts.join(' · ');
}
