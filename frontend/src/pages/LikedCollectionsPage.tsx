import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Heart, Library, Ticket } from 'lucide-react';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { CollectionCardSocialFooter } from '@/components/CollectionCardSocialFooter';
import { CollectionLikeButton } from '@/components/CollectionLikeButton';
import { EmptyState } from '@/components/EmptyState';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { useLikedCollectionsInfinite } from '@/hooks/useCollections';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCollectionCardMeta } from '@/lib/collectionCardMeta';
import { formatRelativeTime } from '@/lib/format';
import { publicProfilePath } from '@/lib/profilePath';
import type { LikedCollection } from '@/types/collection';

function likedCollectionHref(collection: LikedCollection, currentUserId?: string): string | null {
  if (collection.user_id === currentUserId) return `/collections/${collection.id}`;
  const username = collection.author?.username;
  if (username && collection.slug) {
    return `/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(collection.slug)}`;
  }
  return null;
}

function LikedCollectionCard({
  collection,
  currentUserId,
}: {
  collection: LikedCollection;
  currentUserId?: string;
}) {
  const author = collection.author;
  const username = author?.username;
  const authorName = author?.display_name ?? username ?? 'Aficionado';
  const authorHref = publicProfilePath(username);
  const isSelf = collection.user_id === currentUserId;
  const collectionHref = likedCollectionHref(collection, currentUserId);
  const itemsCount = collection.items_count ?? 0;

  const title = collectionHref ? (
    <Link
      to={collectionHref}
      className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {collection.name}
    </Link>
  ) : (
    <p className="font-medium">{collection.name}</p>
  );

  return (
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
          <div className="flex items-start justify-between gap-2">
            {title}
            {collection.liked_at ? (
              <time
                className="shrink-0 text-xs text-muted-foreground"
                dateTime={collection.liked_at}
              >
                {formatRelativeTime(collection.liked_at)}
              </time>
            ) : null}
          </div>
          {collection.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {collection.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {formatCollectionCardMeta(
              itemsCount,
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
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              {author?.avatar_url ? (
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
              <div className="min-w-0">
                {authorHref ? (
                  <Link
                    to={authorHref}
                    className="text-sm font-medium hover:text-primary hover:underline"
                  >
                    {isSelf ? `${authorName} (tú)` : authorName}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">
                    {isSelf ? `${authorName} (tú)` : authorName}
                  </p>
                )}
                {username ? <p className="text-xs text-muted-foreground">@{username}</p> : null}
              </div>
            </div>
            <CollectionLikeButton
              collectionId={collection.id}
              likesCount={collection.likes_count}
              likedByMe={collection.liked_by_me}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function LikedCollectionsPage() {
  useDocumentTitle('Listas que te gustaron');
  const { user } = useAuth();
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useLikedCollectionsInfinite();

  const collections = useMemo(
    () => data?.pages.flatMap((page) => page.collections ?? []) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? collections.length;
  const empty = !isLoading && !isError && total === 0;

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        <section
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          aria-labelledby="liked-collections-heading"
        >
          <div>
            <h1
              id="liked-collections-heading"
              className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              <Heart className="h-7 w-7 text-primary" aria-hidden />
              Listas que te gustaron
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Colecciones a las que diste me gusta
              {!isLoading && total > 0
                ? ` · ${total} ${total === 1 ? 'lista' : 'listas'}`
                : '.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="secondary" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to="/collections/explore">
                <Compass className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1.5">Explorar</span>
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to="/likes">
                <Ticket className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1.5">Capsules</span>
              </Link>
            </Button>
          </div>
        </section>

        {isLoading ? <NinetyLoader variant="panel" className="py-10" /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudieron cargar tus me gusta'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {empty ? (
          <EmptyState
            icon={Heart}
            title="Aún no has dado me gusta a ninguna lista"
            description="Cuando te guste una colección pública, aparecerá aquí."
          >
            <Button asChild>
              <Link to="/collections/explore">Explorar colecciones</Link>
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && collections.length > 0 ? (
          <div className="space-y-4">
            <ul className={capsuleCardListClass}>
              {collections.map((collection) => (
                <li key={collection.id}>
                  <LikedCollectionCard collection={collection} currentUserId={user?.id} />
                </li>
              ))}
            </ul>
            <InfiniteScrollSentinel
              hasNextPage={Boolean(hasNextPage)}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </div>
        ) : null}

        {!isLoading && !isError && collections.length === 0 && total > 0 ? (
          <InfiniteScrollSentinel
            hasNextPage={Boolean(hasNextPage)}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        ) : null}
      </div>
    </Layout>
  );
}
