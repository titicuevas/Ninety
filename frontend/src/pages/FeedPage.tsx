import { Compass, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CapsuleEngagementBar } from '@/components/CapsuleEngagementBar';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { FeedContentFiltersBar } from '@/components/FeedContentFiltersBar';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { CapsuleListSkeleton } from '@/components/ListSkeletons';
import { Layout } from '@/components/Layout';
import { PeopleResultRow } from '@/components/PeopleSearchPanel';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { useCapsuleFeed, type FeedScope, type FeedSort } from '@/hooks/useCapsules';
import { useDiscoverProfiles } from '@/hooks/useDiscoverProfiles';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFeedFilterParams } from '@/hooks/useFeedFilterParams';
import { feedDocumentTitle, feedPath, hasFeedContentFilters } from '@/lib/feedParams';
import { formatRelativeTime } from '@/lib/format';
import {
  postImportFeedHint,
  readDiaryPostImportState,
} from '@/lib/diaryPostImportMemory';
import { publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';
import type { FeedCapsule } from '@/types/capsule';

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
        <CapsuleEngagementBar
          bordered={false}
          className="mt-0"
          capsuleId={capsule.id}
          shareTitle={shareTitle}
          likesCount={capsule.likes_count}
          likedByMe={capsule.liked_by_me}
          commentsCount={capsule.comments_count}
          currentUserId={currentUserId}
          capsuleOwnerId={capsule.user_id}
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
    <div className="flex gap-2" role="tablist" aria-label="Alcance del feed">
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
    <div className="flex gap-2" role="tablist" aria-label="Orden del feed">
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
  const capsules = data?.pages.flatMap((page) => page.capsules) ?? [];
  const followingCount = data?.pages[0]?.following_count;
  const isEmpty = !isLoading && !isError && capsules.length === 0;
  const filterEmpty = isEmpty && contentFiltersActive;
  const showDiscover = isEmpty && scope === 'following' && !contentFiltersActive;
  const { data: discoverData } = useDiscoverProfiles(showDiscover);
  const suggestions = discoverData?.profiles ?? [];
  const postImportHint = user?.id
    ? postImportFeedHint(readDiaryPostImportState(user.id))
    : null;

  const subtitle =
    scope === 'explore'
      ? 'Partidos públicos de la comunidad Ninety.'
      : 'El vestuario digital: partidos de a quien sigues y los tuyos.';

  return (
    <Layout>
      <div className="space-y-8">
        <section className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Feed</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
          </div>
          <ScopeTabs scope={scope} onChange={setScope} />
          <div className="flex flex-wrap items-center gap-3">
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
            description="Prueba otra competición, quita «solo con fotos» o cambia de Siguiendo a Explorar."
          >
            <Button type="button" variant="secondary" onClick={clearContentFilters}>
              Quitar filtros
            </Button>
            {scope === 'following' ? (
              <Button asChild>
                <Link to={feedPath('explore', sort, content)}>Explorar comunidad</Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link to={feedPath('following', sort, content)}>Volver a Siguiendo</Link>
              </Button>
            )}
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
                  ? 'Sigue a otros aficionados para ver sus partidos aquí.'
                  : 'La gente que sigues aún no ha publicado partidos, o aún no has guardado ninguno.')
              }
            >
              <Button asChild variant="secondary">
                <Link to={feedPath('explore', sort)}>Explorar comunidad</Link>
              </Button>
              <Button asChild>
                <Link to="/search?tab=people">Buscar aficionados</Link>
              </Button>
              {postImportHint ? (
                <Button asChild variant="secondary">
                  <Link to="/collections?new=1">Crear colección</Link>
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link to="/search">Buscar partido</Link>
                </Button>
              )}
            </EmptyState>

            {suggestions.length > 0 ? (
              <section className="space-y-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
                    Aficionados sugeridos
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Priorizamos gente con tu mismo equipo o cercana.
                  </p>
                </div>
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
            description="Cuando la comunidad publique partidos públicos, aparecerán aquí."
          >
            <Button asChild>
              <Link to="/search">Crear tu primera Capsule</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={feedPath('following', sort)}>Volver a Siguiendo</Link>
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && capsules.length > 0 ? (
          <div className="space-y-4">
            <ul className="space-y-3">
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
