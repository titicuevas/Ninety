export const WATCH_CONTEXTS = ['stadium', 'tv', 'pub', 'other'] as const;

export type WatchContext = (typeof WATCH_CONTEXTS)[number];

export const WATCH_CONTEXT_LABELS: Record<WatchContext, string> = {
  stadium: 'Estadio',
  tv: 'TV',
  pub: 'Bar',
  other: 'Otro',
};

export function isWatchContext(value: unknown): value is WatchContext {
  return typeof value === 'string' && (WATCH_CONTEXTS as readonly string[]).includes(value);
}

export function watchContextLabel(value: string | null | undefined): string | null {
  if (!isWatchContext(value)) return null;
  return WATCH_CONTEXT_LABELS[value];
}
