import { useEffect, useEffectEvent, useRef } from 'react';
import {
  canFetchNextPage,
  INFINITE_SCROLL_ROOT_MARGIN,
} from '@/lib/infiniteScroll';

export type UseInfiniteScrollOptions = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  enabled?: boolean;
  rootMargin?: string;
};

/**
 * Observa un sentinel al pie de una lista infinita y dispara `fetchNextPage`
 * al acercarse al viewport. Reconecta al terminar un fetch por si el sentinel
 * sigue visible.
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  enabled = true,
  rootMargin = INFINITE_SCROLL_ROOT_MARGIN,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const onIntersect = useEffectEvent(() => {
    if (!canFetchNextPage({ enabled, hasNextPage, isFetchingNextPage })) return;
    void fetchNextPage();
  });

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled || !hasNextPage) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onIntersect();
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // isFetchingNextPage: al terminar un fetch, re-observe si sigue en vista.
  }, [enabled, hasNextPage, isFetchingNextPage, rootMargin]);

  return sentinelRef;
}
