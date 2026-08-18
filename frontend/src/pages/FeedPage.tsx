import { Compass, Library, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActivityShortcutLink } from '@/components/ActivityShortcutLink';
import { CapsuleCardSocialFooter } from '@/components/CapsuleCardSocialFooter';
import { CapsuleListCard, capsuleCardListClass } from '@/components/CapsuleListCard';
import { CollectionCardSocialFooter } from '@/components/CollectionCardSocialFooter';
import { EmptyState } from '@/components/EmptyState';
import { FeedContentFiltersBar } from '@/components/FeedContentFiltersBar';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { CapsuleListSkeleton } from '@/components/ListSkeletons';
import { Layout } from '@/components/Layout';
import { PeopleResultRow } from '@/components/PeopleSearchPanel';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { useCapsuleFeed, type FeedScope, type FeedSort } from '@/hooks/useCapsules';
import { useDiscoverCollections } from '@/hooks/useDiscoverCollections';
import { useDiscoverProfiles } from '@/hooks/useDiscoverProfiles';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFeedFilterParams } from '@/hooks/useFeedFilterParams';
import { formatCollectionCardMeta } from '@/lib/collectionCardMeta';
import { discoverCollectionMatchLabel } from '@/lib/discoverCollections';
import { feedDocumentTitle, feedPath, hasFeedContentFilters } from '@/lib/feedParams';
import { capsuleShareSummaryFrom } from '@/lib/capsuleShare';
import { formatRelativeTime } from '@/lib/format';
import {
  postImportFeedHint,
  readDiaryPostImportState,
} from '@/lib/diaryPostImportMemory';
import { profilePath, publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';
import type { FeedCapsule } from '@/types/capsule';
import type { DiscoverCollection } from '@/types/collection';

function FeedDiscoverCollectionRow({
  collection,
  currentUserId,
}: {
  collection: DiscoverCollection;
  currentUserId?: string;
}) {
  const author = collection.author;
  const username = author.username;
  const matchLabel = discoverCollectionMatchLabel(collection.match_reason);
  const href =
    username && collection.slug
      ? `/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(collection.slug)}`
      : null;
  const authorHref = username ? profilePath(username) : null;

  return (
    <li className="rounded-xl border border-border bg-card p-3 sm:p-3.5">
      <div className="flex items-start gap-3">
        {collection.cover_url ? (
          <img
            src={collection.cover_url}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-hidden
          >
            <Library className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {href ? (
            <Link
              to={href}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {collection.name}
            </Link>
          ) : (
            <p className="font-medium">{collection.name}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatCollectionCardMeta(
              collection.items_count ?? 0,
              collection.likes_count ?? 0,
              collection.comments_count ?? 0,
            )}
            {matchLabel ? ` · ${matchLabel}` : ''}
            {authorHref && username ? (
              <>
                {' · '}
                <Link to={authorHref} className="text-primary hover:underline">
                  @{username}
                </Link>
              </>
            ) : null}
          </p>
          <CollectionCardSocialFooter
            className="mt-2 space-y-1"
            collectionId={collection.id}
            ownerId={collection.user_id}
            currentUserId={currentUserId}
            likesCount={collection.likes_count}
            commentsCount={collection.comments_count}
          />
        </div>
      </div>
    </li>
  );
}

function AuthorName({ capsule, currentUserId }: { capsule: FeedCapsule; currentUserId?: string }) {
  const name = capsule.profiles?.display_name ?? capsule.profiles?.username ?? 'Aficionado';
  const isSelf = capsule.user_id === currentUserId;
  const label = isSelf ? `${name} (tú)` : name;
  const href = publicProfilePath(capsule.profiles?.username);

  if (href) {
    return (
      <Link to={href} className="text-sm font-medium text-primary hover:underline">
        {label}
      </Link>
    );
  }

  return <p className="text-sm font-medium text-primary">{label}</p>;
}

function FeedCapsuleCard({ capsule, currentUserId }: { capsule: FeedCapsule; currentUserId?: string }) {
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;

  return (
    <CapsuleListCard
      capsule={capsule}
      competitionTone="muted"
      photoClassName="mb-3"
      footerBordered
      header={
        <div className="mb-3 flex items-center justify-between gap-2">
          <AuthorName capsule={capsule} currentUserId={currentUserId} />
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={capsule.created_at}>
            {formatRelativeTime(capsule.created_at)}
          </time>
        </div>
      }
      footer={
        <CapsuleCardSocialFooter
          capsuleId={capsule.id}
          capsuleOwnerId={capsule.user_id}
          currentUserId={currentUserId}
          likesCount={capsule.likes_count}
          likedByMe={capsule.liked_by_me}
          commentsCount={capsule.comments_count}
          shareTitle={shareTitle}
          share={capsuleShareSummaryFrom(capsule, capsule.profiles)}
          isPublic={capsule.is_public !== false}
        />
      }
    />
  );
}

function ScopeTabs({
  scope,
  onChange,
}: {
  scope: FeedScope;
  onChange: (next: FeedScope) => void;
}) {
  return (
    <div className="flex shrink-0 gap-2" role="tablist" aria-label="Alcance del feed">
      {(
        [
          ['following', 'Siguiendo'],
          ['explore', 'Explorar'],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={scope === key}
          onClick={() => onChange(key)}
          className={cn(
            'min-h-9 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            scope === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SortTabs({ sort, onChange }: { sort: FeedSort; onChange: (next: FeedSort) => void }) {
  return (
    <div className="flex shrink-0 gap-2" role="tablist" aria-label="Orden del feed">
      {(
        [
          ['recent', 'Recientes'],
          ['popular', 'Populares'],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={sort === key}
          onClick={() => onChange(key)}
          className={cn(
            'min-h-9 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            sort === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function FeedPage() {
  const { user } = useAuth();
  const {
    scope,
    sort,
    content,
    photosOnly,
    competition,
    setScope,
    setSort,
    setPhotosOnly,
    setCompetition,
    clearContentFilters,
  } = useFeedFilterParams();
  const contentFiltersActive = hasFeedContentFilters(content);
  useDocumentTitle(feedDocumentTitle(scope, sort, content));
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch,
    isRefetching,
  } = useCapsuleFeed(scope, sort, content);
  const capsules = data?.pages.flatMap((page) => page.capsules ?? []) ?? [];
  const followingCount = data?.pages[0]?.following_count;
  const isEmpty = !isLoading && !isError && capsules.length === 0;
  const filterEmpty = isEmpty && contentFiltersActive;
  const showDiscover = isEmpty && scope === 'following' && !contentFiltersActive;
  const { data: discoverData } = useDiscoverProfiles(showDiscover);
  const { data: discoverCollectionsData } = useDiscoverCollections(showDiscover);
  const suggestions = discoverData?.profiles ?? [];
  const collectionSuggestions = (discoverCollectionsData?.collections ?? []).slice(0, 3);
  const postImportHint = user?.id
    ? postImportFeedHint(readDiaryPostImportState(user.id))
    : null;

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        <section className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Feed</h1>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 sm:flex-wrap sm:overflow-visible">
            <ScopeTabs scope={scope} onChange={setScope} />
            <ActivityShortcutLink
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 rounded-full px-0 sm:w-auto sm:px-3"
            />
            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
            <SortTabs sort={sort} onChange={setSort} />
            {isFetching && !isLoading && !isFetchingNextPage ? (
              <span className="text-xs text-muted-foreground" aria-live="polite">
                Actualizando…
              </span>
            ) : null}
          </div>
          <FeedContentFiltersBar
            photosOnly={photosOnly}
            competition={competition}
            hasFilters={contentFiltersActive}
            onPhotosOnlyChange={setPhotosOnly}
            onCompetitionChange={setCompetition}
            onClear={clearContentFilters}
          />
        </section>

        {isLoading ? <CapsuleListSkeleton withAuthor count={3} /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudo cargar el feed'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {filterEmpty ? (
          <EmptyState
            icon={Compass}
            title="Ningún partido con estos filtros"
            description="Prueba otra competición o quita «solo con fotos»."
          >
            <Button type="button" variant="secondary" onClick={clearContentFilters}>
              Quitar filtros
            </Button>
            {scope === 'following' ? (
              <Button asChild>
                <Link to={feedPath('explore', sort, content)}>Explorar comunidad</Link>
              </Button>
            ) : null}
          </EmptyState>
        ) : null}

        {isEmpty && scope === 'following' && !contentFiltersActive ? (
          <div className="space-y-6">
            <EmptyState
              icon={Users}
              title="Tu feed está vacío"
              description={
                postImportHint ??
                (followingCount === 0
                  ? 'Sigue aficionados o explora la comunidad para llenarlo.'
                  : 'Quien sigues aún no ha publicado, o tú tampoco.')
              }
            >
              <Button asChild>
                <Link to={feedPath('explore', sort)}>Explorar comunidad</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/search?tab=people">Buscar aficionados</Link>
              </Button>
              {postImportHint ? (
                <Button asChild variant="secondary">
                  <Link to="/collections?new=1">Crear colección</Link>
                </Button>
              ) : null}
            </EmptyState>

            {collectionSuggestions.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
                  Listas para descubrir
                </h2>
                <ul className="space-y-2">
                  {collectionSuggestions.map((collection) => (
                    <FeedDiscoverCollectionRow
                      key={collection.id}
                      collection={collection}
                      currentUserId={user?.id}
                    />
                  ))}
                </ul>
                <Button asChild variant="ghost" size="sm" className="px-0 text-primary">
                  <Link to="/collections/explore">Ver más listas</Link>
                </Button>
              </section>
            ) : null}

            {suggestions.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
                  Aficionados sugeridos
                </h2>
                <ul className="space-y-2">
                  {suggestions.map((profile) => (
                    <PeopleResultRow key={profile.id} profile={profile} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {isEmpty && scope === 'explore' && !contentFiltersActive ? (
          <EmptyState
            icon={Compass}
            title="Aún no hay cápsulas públicas"
            description="Cuando la comunidad publique partidos, aparecerán aquí."
          >
            <Button asChild>
              <Link to="/search">Crear tu primera Capsule</Link>
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && capsules.length > 0 ? (
          <div className="space-y-4">
            <ul className={capsuleCardListClass}>
              {capsules.map((capsule) => (
                <li key={capsule.id}>
                  <FeedCapsuleCard capsule={capsule} currentUserId={user?.id} />
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
      </div>
    </Layout>
  );
}
