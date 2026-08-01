import { isWatchContext, type WatchContext } from '@/lib/watchContext';

export type DiaryVisibility = 'all' | 'public' | 'private';

export function parseYear(value: string | null): number | undefined {
  if (!value) return undefined;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1990 || year > 2100) return undefined;
  return year;
}

export function parseRatingMin(value: string | null): number | undefined {
  if (!value) return undefined;
  const rating = Number(value);
  if (![3, 4, 5].includes(rating)) return undefined;
  return rating;
}

export function parseVisibility(value: string | null): DiaryVisibility {
  if (value === 'public' || value === 'private') return value;
  return 'all';
}

export function parseWatchContext(value: string | null): WatchContext | undefined {
  return isWatchContext(value) ? value : undefined;
}
