/** Prefetch antes de que el sentinel entre en el viewport. */
export const INFINITE_SCROLL_ROOT_MARGIN = '240px 0px';

export type InfiniteScrollGate = {
  enabled?: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

/** Si el observer o el botón de respaldo pueden pedir la siguiente página. */
export function canFetchNextPage({
  enabled = true,
  hasNextPage,
  isFetchingNextPage,
}: InfiniteScrollGate): boolean {
  return Boolean(enabled && hasNextPage && !isFetchingNextPage);
}
