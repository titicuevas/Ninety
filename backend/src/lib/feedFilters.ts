import { sanitizePostgrestSearch } from './postgrestSafe.js';

/** Filtros de contenido del feed (competición / solo fotos). */

export type FeedContentFilters = {
  photosOnly: boolean;
  /** Patrón ya saneado para ilike; vacío = sin filtro. */
  competition: string;
};

/** Quita comodines y ruido de PostgREST `ilike`. */
export function sanitizeFeedCompetition(raw: string | undefined): string {
  return sanitizePostgrestSearch(raw, 100);
}

export function parseFeedPhotosParam(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw !== 'string') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function resolveFeedContentFilters(input: {
  photos?: unknown;
  competition?: unknown;
}): FeedContentFilters {
  const competitionRaw = typeof input.competition === 'string' ? input.competition : undefined;
  const competition = sanitizeFeedCompetition(competitionRaw);
  return {
    photosOnly: parseFeedPhotosParam(input.photos),
    competition: competition.length >= 2 ? competition : '',
  };
}

/**
 * Aplica filtros de contenido sobre un query builder de Supabase/PostgREST.
 * `photosOnly` exige `photo_urls` no vacío (legado `photo_url` ya backfilled).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFeedContentFilters(query: any, filters: FeedContentFilters): any {
  let next = query;
  if (filters.photosOnly) {
    next = next.not('photo_urls', 'eq', '{}');
  }
  if (filters.competition) {
    next = next.ilike('competition_name', `%${filters.competition}%`);
  }
  return next;
}
