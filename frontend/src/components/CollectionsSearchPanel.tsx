import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Search } from 'lucide-react';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { DiscoverCollectionCard } from '@/components/DiscoverCollectionCard';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { NinetyLoader } from '@/components/NinetyLoader';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuthInit';
import { useDiscoverCollections } from '@/hooks/useDiscoverCollections';
import { useDiscoverCollectionsFilterParams } from '@/hooks/useDiscoverCollectionsFilterParams';
import {
  DISCOVER_COLLECTIONS_SORT_CHIPS,
  hasDiscoverCollectionsSearch,
} from '@/lib/discoverCollectionsParams';

export function CollectionsSearchPanel({
  autoFocus = false,
  testId,
}: {
  autoFocus?: boolean;
  testId?: string;
}) {
  const searchId = useId();
  const { user } = useAuth();
  const { q, qDraft, setQDraft, sort, setSort, clearFilters } =
    useDiscoverCollectionsFilterParams();
  const { data, isLoading, isError, error, refetch, isRefetching } = useDiscoverCollections({
    q,
    sort,
  });
  const collections = data?.collections ?? [];
  const hasSearch = hasDiscoverCollectionsSearch(q, sort);

  return (
    <div className="space-y-6" data-testid={testId}>
      <div className="max-w-xl space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={searchId}>Nombre, descripción o autor</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id={searchId}
              type="search"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Nombre, descripción o autor…"
              className="pl-9"
              autoFocus={autoFocus}
              autoComplete="off"
            />
          </div>
        </div>

        <div
          className={filterChipRowClass}
          role="group"
          aria-label="Ordenar colecciones"
          data-testid="explore-collections-sort"
        >
          {DISCOVER_COLLECTIONS_SORT_CHIPS.map((chip) => (
            <FilterChip
              key={chip.value}
              active={sort === chip.value}
              onClick={() => setSort(chip.value)}
            >
              {chip.label}
            </FilterChip>
          ))}
        </div>

        {hasSearch ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      {isLoading ? <NinetyLoader variant="panel" className="py-10" /> : null}

      {isError ? (
        <QueryErrorCard
          className="max-w-xl"
          message={error instanceof Error ? error.message : 'No se pudieron cargar las colecciones'}
          loading={isRefetching}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && collections.length === 0 ? (
        <EmptyState
          icon={Compass}
          className="max-w-xl"
          title={hasSearch ? 'Sin resultados' : 'Aún no hay listas para explorar'}
          description={
            hasSearch
              ? 'Prueba otro término o cambia el orden.'
              : 'Cuando otros publiquen colecciones, aparecerán aquí.'
          }
        >
          {hasSearch ? (
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to="/collections">Crear tu primera colección</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/search?tab=people">Buscar aficionados</Link>
              </Button>
            </>
          )}
        </EmptyState>
      ) : null}

      {!isLoading && !isError && collections.length > 0 ? (
        <section aria-labelledby="explore-collections-list-heading">
          <h2 id="explore-collections-list-heading" className="sr-only">
            Colecciones sugeridas
          </h2>
          <ul className={capsuleCardListClass}>
            {collections.map((collection) => (
              <DiscoverCollectionCard
                key={collection.id}
                collection={collection}
                currentUserId={user?.id}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
