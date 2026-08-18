import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Library, Search } from 'lucide-react';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { CollectionCardSocialFooter } from '@/components/CollectionCardSocialFooter';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { FollowButton } from '@/components/FollowButton';
import { FollowsYouBadge } from '@/components/FollowsYouBadge';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuthInit';
import { useDiscoverCollections } from '@/hooks/useDiscoverCollections';
import { useDiscoverCollectionsFilterParams } from '@/hooks/useDiscoverCollectionsFilterParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCollectionCardMeta } from '@/lib/collectionCardMeta';
import { discoverCollectionMatchLabel } from '@/lib/discoverCollections';
import {
  DISCOVER_COLLECTIONS_SORT_CHIPS,
  hasDiscoverCollectionsSearch,
} from '@/lib/discoverCollectionsParams';
import { profilePath } from '@/lib/profilePath';
import type { DiscoverCollection } from '@/types/collection';

function DiscoverCollectionCard({
  collection,
  currentUserId,
}: {
  collection: DiscoverCollection;
  currentUserId?: string;
}) {
  const author = collection.author;
  const username = author.username;
  const authorName = author.display_name ?? username ?? 'Aficionado';
  const matchLabel = discoverCollectionMatchLabel(collection.match_reason);
  const collectionHref =
    username && collection.slug
      ? `/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(collection.slug)}`
      : null;

  return (
    <li>
      <article className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
        <div className="flex items-start gap-3">
          {collection.cover_url ? (
            <img
              src={collection.cover_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              aria-hidden
            >
              <Library className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {collectionHref ? (
              <Link
                to={collectionHref}
                className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {collection.name}
              </Link>
            ) : (
              <p className="font-medium">{collection.name}</p>
            )}
            {collection.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {collection.description}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {formatCollectionCardMeta(
                collection.items_count ?? 0,
                collection.likes_count ?? 0,
                collection.comments_count ?? 0,
              )}
            </p>
            <CollectionCardSocialFooter
              className="mt-2 space-y-1"
              collectionId={collection.id}
              ownerId={collection.user_id}
              currentUserId={currentUserId}
              likesCount={collection.likes_count}
              commentsCount={collection.comments_count}
              alsoLiked={collection.also_liked}
              alsoCommented={collection.also_commented}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {authorName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {username ? (
                    <Link
                      to={profilePath(username)}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {authorName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{authorName}</span>
                  )}
                  {matchLabel ? (
                    <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {matchLabel}
                    </span>
                  ) : null}
                  {author.follows_me ? <FollowsYouBadge /> : null}
                </div>
                {username ? (
                  <p className="text-xs text-muted-foreground">@{username}</p>
                ) : null}
              </div>
              {username ? (
                <FollowButton
                  username={username}
                  followedByMe={author.followed_by_me ?? false}
                  followsMe={author.follows_me ?? false}
                  size="compact"
                />
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export function ExploreCollectionsPage() {
  useDocumentTitle('Explorar colecciones');
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
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        <section aria-labelledby="explore-collections-heading" className="space-y-4">
          <h1
            id="explore-collections-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            <Compass className="h-7 w-7 text-primary" aria-hidden />
            Explorar colecciones
          </h1>

          <div className="space-y-3">
            <label htmlFor={searchId} className="sr-only">
              Buscar colecciones
            </label>
            <div className="relative max-w-xl">
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
                autoComplete="off"
              />
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
        </section>

        {isLoading ? <NinetyLoader variant="panel" className="py-10" /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudieron cargar las colecciones'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isLoading && !isError && collections.length === 0 ? (
          <EmptyState
            icon={Compass}
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
    </Layout>
  );
}
