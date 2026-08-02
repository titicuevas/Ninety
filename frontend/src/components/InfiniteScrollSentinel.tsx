import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { cn } from '@/lib/utils';

type InfiniteScrollSentinelProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  enabled?: boolean;
  className?: string;
};

/**
 * Pie de lista infinita: auto-carga al acercarse y botón «Cargar más» como
 * respaldo (teclado / sin IntersectionObserver).
 */
export function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  enabled = true,
  className,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    enabled,
  });

  if (!enabled || !hasNextPage) return null;

  return (
    <div className={cn('flex flex-col items-center gap-2 pt-2', className)}>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      {isFetchingNextPage ? (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          Cargando más…
        </p>
      ) : (
        <Button type="button" variant="secondary" onClick={() => void fetchNextPage()}>
          Cargar más
        </Button>
      )}
    </div>
  );
}
