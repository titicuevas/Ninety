import { Link, useParams } from 'react-router-dom';
import { Library, MapPin, Swords, Trophy } from 'lucide-react';
import { AchievementsSection } from '@/components/AchievementsSection';
import { BlockUserButton } from '@/components/BlockUserButton';
import { CapsuleCardSocialFooter } from '@/components/CapsuleCardSocialFooter';
import { CapsuleDiaryFilters } from '@/components/CapsuleDiaryFilters';
import { CapsuleListCard, capsuleCardListClass } from '@/components/CapsuleListCard';
import { CollectionAlsoCommented } from '@/components/CollectionAlsoCommented';
import { CollectionAlsoLiked } from '@/components/CollectionAlsoLiked';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { FollowsYouBadge } from '@/components/FollowsYouBadge';
import { MuteUserButton } from '@/components/MuteUserButton';
import { ReportContentButton } from '@/components/ReportContentButton';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { Layout } from '@/components/Layout';
import { ProfileLoadingSkeleton } from '@/components/ListSkeletons';
import { PublicLayout } from '@/components/PublicLayout';
import { PublicWrappedSummary } from '@/components/PublicWrappedSummary';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ShareProfileButton } from '@/components/ShareProfileButton';
import { Button } from '@/components/ui/button';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { usePublicCollections } from '@/hooks/useCollections';
import { useAuth } from '@/hooks/useAuthInit';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { useDiaryFilterParams } from '@/hooks/useDiaryFilterParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  achievementsInputFromPublicStats,
  computeAchievements,
  countUnlockedAchievements,
} from '@/lib/achievements';
import { isAutoUsername } from '@/lib/profileHelpers';
import { isPublicProfileNotFound } from '@/lib/publicProfileError';
import { capsuleShareSummaryFrom } from '@/lib/capsuleShare';
import { formatCollectionCardMeta } from '@/lib/collectionCardMeta';
import { teamPathFromFavorite } from '@/lib/teamPath';
import type { Capsule } from '@/types/capsule';

function PublicCapsuleCard({
  capsule,
  currentUserId,
  author,
}: {
  capsule: Capsule & { likes_count?: number; liked_by_me?: boolean; comments_count?: number };
  currentUserId?: string;
  author?: { display_name?: string | null; username?: string | null } | null;
}) {
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;

  return (
    <CapsuleListCard
      capsule={capsule}
      showWatchedDate
      footerBordered
      footer={
        <CapsuleCardSocialFooter
          capsuleId={capsule.id}
          capsuleOwnerId={capsule.user_id}
          currentUserId={currentUserId}
          likesCount={capsule.likes_count}
          likedByMe={capsule.liked_by_me}
          commentsCount={capsule.comments_count}
          shareTitle={shareTitle}
          share={capsuleShareSummaryFrom(capsule, author)}
          isPublic={capsule.is_public !== false}
        />
      }
    />
  );
}

function PublicProfileHeader({
  profile,
  displayName,
  location,
  diaryTotal,
  unlockedAchievements,
  collectionsCount,
  isOwnProfile,
  isBlockedByMe,
  user,
  loginTo,
}: {
  profile: NonNullable<ReturnType<typeof usePublicProfile>['data']>['pages'][0]['profile'];
  displayName: string;
  location: string;
  diaryTotal: number;
  unlockedAchievements: number;
  collectionsCount: number;
  isOwnProfile: boolean;
  isBlockedByMe: boolean;
  user: ReturnType<typeof useAuth>['user'];
  loginTo: string;
}) {
  return (
    <section className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className="h-20 w-20 shrink-0 rounded-full border border-border bg-secondary object-contain p-1.5"
        />
      ) : (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
        {profile.username ? <p className="text-muted-foreground">@{profile.username}</p> : null}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
          {profile.favorite_team && teamPathFromFavorite(profile.favorite_team) ? (
            <Link
              to={teamPathFromFavorite(profile.favorite_team)!}
              className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
            >
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              {profile.favorite_team}
            </Link>
          ) : null}
          {location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {location}
            </span>
          ) : null}
        </div>

        {profile.bio?.trim() ? (
          <p className="mt-3 max-w-prose text-sm text-muted-foreground sm:text-left">{profile.bio.trim()}</p>
        ) : null}

        <p className="mt-2 text-sm text-muted-foreground">
          {diaryTotal === 1 ? '1 partido en su diario' : `${diaryTotal} partidos en su diario`}
          {unlockedAchievements > 0
            ? ` · ${unlockedAchievements} ${unlockedAchievements === 1 ? 'logro' : 'logros'}`
            : null}
        </p>

        {profile.username ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
            <Link
              to={`/u/${encodeURIComponent(profile.username)}/followers`}
              className="hover:text-foreground hover:underline"
            >
              <span className="font-medium text-foreground">{profile.followers_count ?? 0}</span>{' '}
              {profile.followers_count === 1 ? 'seguidor' : 'seguidores'}
            </Link>
            {' · '}
            <Link
              to={`/u/${encodeURIComponent(profile.username)}/following`}
              className="hover:text-foreground hover:underline"
            >
              <span className="font-medium text-foreground">{profile.following_count ?? 0}</span>{' '}
              siguiendo
            </Link>
            {user && !isOwnProfile && profile.follows_me ? (
              <>
                {' · '}
                <FollowsYouBadge />
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-start">
        {isOwnProfile ? (
          <Button asChild variant="secondary" size="sm">
            <Link to="/profile">Editar perfil</Link>
          </Button>
        ) : profile.username && user ? (
          isBlockedByMe ? (
            <>
              <BlockUserButton username={profile.username} blockedByMe size="compact" />
              <ReportContentButton
                targetType="user"
                targetId={profile.id}
                username={profile.username}
                size="icon"
              />
            </>
          ) : (
            <>
              <FollowButton
                username={profile.username}
                followedByMe={profile.followed_by_me}
                followsMe={profile.follows_me}
                size="compact"
              />
              <MuteUserButton
                username={profile.username}
                mutedByMe={profile.muted_by_me}
                size="icon"
              />
              <BlockUserButton
                username={profile.username}
                blockedByMe={profile.blocked_by_me}
                size="icon"
              />
              <ReportContentButton
                targetType="user"
                targetId={profile.id}
                username={profile.username}
                size="icon"
              />
            </>
          )
        ) : profile.username ? (
          <Button asChild size="sm">
            <Link to={loginTo}>Inicia sesión para seguir</Link>
          </Button>
        ) : null}
        {!isOwnProfile && !isBlockedByMe && profile.username && !isAutoUsername(profile.username) ? (
          <Button asChild variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
            <Link to={`/u/${encodeURIComponent(profile.username)}/vs`}>
              <Swords className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Cara a cara</span>
            </Link>
          </Button>
        ) : null}
        {!isBlockedByMe && profile.username && !isAutoUsername(profile.username) ? (
          <ShareProfileButton
            username={profile.username}
            displayName={displayName}
            favoriteTeam={profile.favorite_team}
            city={profile.city}
            country={profile.country}
            publicCapsulesCount={diaryTotal}
            collectionsCount={collectionsCount}
            achievementsCount={unlockedAchievements}
            followersCount={profile.followers_count}
            compact
          />
        ) : null}
      </div>
    </section>
  );
}

function PublicCollectionsSections({
  profile,
  featuredCollection,
  collections,
  isOwnProfile,
  isBlockedByMe,
  viewerUserId,
}: {
  profile: NonNullable<ReturnType<typeof usePublicProfile>['data']>['pages'][0]['profile'];
  featuredCollection: NonNullable<ReturnType<typeof usePublicProfile>['data']>['pages'][0]['featured_collection'];
  collections: NonNullable<ReturnType<typeof usePublicCollections>['data']>['collections'] | undefined;
  isOwnProfile: boolean;
  isBlockedByMe: boolean;
  viewerUserId?: string;
}) {
  if (isBlockedByMe) return null;

  return (
    <>
      {featuredCollection && profile?.username ? (
        <section className="space-y-3" aria-labelledby="featured-collection-heading">
          <h2
            id="featured-collection-heading"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Library className="h-5 w-5 text-primary" aria-hidden />
            Colección destacada
          </h2>
          <div className="space-y-2">
            <Link
              to={`/u/${encodeURIComponent(profile.username)}/lists/${encodeURIComponent(featuredCollection.slug)}`}
              className="flex items-center gap-3 rounded-xl border border-primary/40 bg-card/50 px-3 py-3 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {featuredCollection.cover_url ? (
                <img
                  src={featuredCollection.cover_url}
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
              <div className="min-w-0">
                <p className="font-medium">{featuredCollection.name}</p>
                {featuredCollection.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {featuredCollection.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatCollectionCardMeta(
                    featuredCollection.items_count,
                    featuredCollection.likes_count ?? 0,
                    featuredCollection.comments_count ?? 0,
                  )}
                </p>
              </div>
            </Link>
            {viewerUserId ? (
              <>
                {(featuredCollection.likes_count ?? 0) > 0 ? (
                  <CollectionAlsoLiked
                    collectionId={featuredCollection.id}
                    exceptUserId={profile.id}
                  />
                ) : null}
                {(featuredCollection.comments_count ?? 0) > 0 ? (
                  <CollectionAlsoCommented
                    collectionId={featuredCollection.id}
                    exceptUserId={profile.id}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {(collections?.length ?? 0) > 0 ? (
        <section className="space-y-3" aria-labelledby="public-collections-heading">
          <h2
            id="public-collections-heading"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Library className="h-5 w-5 text-primary" aria-hidden />
            Colecciones
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {collections!.map((col) => (
              <li key={col.id}>
                <Link
                  to={`/u/${encodeURIComponent(profile.username!)}/lists/${encodeURIComponent(col.slug)}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-3 py-3 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {col.cover_url ? (
                    <img
                      src={col.cover_url}
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
                  <div className="min-w-0">
                    <p className="font-medium">{col.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCollectionCardMeta(col.items_count ?? 0, col.likes_count ?? 0)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : isOwnProfile ? (
        <section className="space-y-3" aria-labelledby="public-collections-empty-heading">
          <h2
            id="public-collections-empty-heading"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Library className="h-5 w-5 text-primary" aria-hidden />
            Colecciones
          </h2>
          <Button asChild variant="secondary" size="sm">
            <Link to="/collections">
              <Library className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Crear tu primera colección
            </Link>
          </Button>
        </section>
      ) : null}
    </>
  );
}

function PublicDiaryEmptyState({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <EmptyState
      title={isOwnProfile ? 'Aún no has guardado partidos' : 'Diario vacío'}
      description={
        isOwnProfile
          ? 'Busca un partido que hayas visto y empieza tu diario.'
          : 'Este aficionado aún no ha publicado partidos en su diario.'
      }
    >
      {isOwnProfile ? (
        <Button asChild>
          <Link to="/search">Buscar partido</Link>
        </Button>
      ) : null}
    </EmptyState>
  );
}

function PublicDiaryCapsulesSection({
  total,
  years,
  availableTags,
  qDraft,
  year,
  ratingMin,
  watchContext,
  tag,
  query,
  capsules,
  userId,
  author,
  onQDraftChange,
  patchParams,
  clearFilters,
  fetchNextPage,
}: {
  total: number;
  years: number[];
  availableTags: string[];
  qDraft: string;
  year: number | undefined;
  ratingMin: number | undefined;
  watchContext: ReturnType<typeof useDiaryFilterParams>['watchContext'];
  tag: string | undefined;
  query: {
    hasFilters: boolean;
    isLoading: boolean;
    isUpdating: boolean;
    isFetchingNextPage: boolean;
    filterEmpty: boolean;
    hasNextPage: boolean;
  };
  capsules: Capsule[];
  userId: string | undefined;
  author?: { display_name?: string | null; username?: string | null } | null;
  onQDraftChange: (value: string) => void;
  patchParams: ReturnType<typeof useDiaryFilterParams>['patchParams'];
  clearFilters: () => void;
  fetchNextPage: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Capsules
          {(query.hasFilters || total > 0) && !query.isLoading ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {total} {total === 1 ? 'partido' : 'partidos'}
              {query.hasFilters ? ' filtrados' : ''}
            </span>
          ) : null}
        </h2>
      </div>

      <CapsuleDiaryFilters
        years={years}
        availableTags={availableTags}
        collapsible
        searchAriaLabel="Buscar en el diario público"
        ariaLabel="Filtros del diario público"
        qDraft={qDraft}
        year={year}
        ratingMin={ratingMin}
        watchContext={watchContext}
        tag={tag}
        hasFilters={query.hasFilters}
        isUpdating={query.isUpdating}
        onQDraftChange={onQDraftChange}
        patchParams={patchParams}
        clearFilters={clearFilters}
      />

      {query.filterEmpty ? (
        <EmptyState
          title="Ningún partido con estos filtros"
          description="Prueba otro año, valoración o limpia la búsqueda."
        >
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </EmptyState>
      ) : null}

      {capsules.length > 0 ? (
        <>
          <ul className={capsuleCardListClass}>
            {capsules.map((capsule) => (
              <li key={capsule.id}>
                <PublicCapsuleCard
                  capsule={capsule}
                  currentUserId={userId}
                  author={author}
                />
              </li>
            ))}
          </ul>
          <InfiniteScrollSentinel
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      ) : null}
    </section>
  );
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { loginTo } = useAuthReturnLinks();
  const {
    q,
    qDraft,
    setQDraft,
    year,
    ratingMin,
    watchContext,
    tag,
    hasFilters,
    patchParams,
    clearFilters,
  } = useDiaryFilterParams();

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isRefetching,
    fetchNextPage,
    refetch,
  } = usePublicProfile(username, { q, year, ratingMin, watchContext, tag });

  const { data: collectionsData } = usePublicCollections(username);

  const profile = data?.pages[0]?.profile;
  const isBlockedByMe = !!profile?.blocked_by_me || !!data?.pages[0]?.blocked;
  const notFound = !username || (isError && isPublicProfileNotFound(error));
  useDocumentTitle(
    profile?.username
      ? `@${profile.username}`
      : isLoading
        ? 'Perfil'
        : notFound || (!isError && !profile)
          ? 'Perfil no encontrado'
          : 'Perfil',
  );
  const capsules = isBlockedByMe ? [] : (data?.pages.flatMap((page) => page.capsules ?? []) ?? []);
  const total = isBlockedByMe ? 0 : (data?.pages[0]?.total ?? capsules.length);
  const stats = isBlockedByMe ? undefined : data?.pages[0]?.stats;
  const years = isBlockedByMe ? [] : (data?.pages[0]?.years ?? []);
  const availableTags = isBlockedByMe ? [] : (data?.pages[0]?.tags ?? []);
  const featuredCollection = isBlockedByMe ? null : (data?.pages[0]?.featured_collection ?? null);
  const isOwnProfile = !!user && profile?.id === user.id;
  const Shell = user ? Layout : PublicLayout;

  const diaryTotal = stats?.totalMatches ?? (!hasFilters ? total : 0);

  if (isLoading) {
    return (
      <Shell>
        <ProfileLoadingSkeleton />
      </Shell>
    );
  }

  if (isError && !isPublicProfileNotFound(error)) {
    return (
      <Shell>
        <div className="space-y-4 py-8">
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudo cargar el perfil'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        </div>
      </Shell>
    );
  }

  if (notFound || !profile) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Usuario no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'No existe ese perfil público.'}
          </p>
          <Button asChild variant="secondary">
            <Link to={user ? '/feed' : '/'}>{user ? 'Volver al feed' : 'Volver al inicio'}</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const displayName = profile.display_name ?? profile.username ?? 'Aficionado';
  const location = [profile.city, profile.country].filter(Boolean).join(', ');
  const diaryEmpty = !hasFilters && diaryTotal === 0 && capsules.length === 0;
  const filterEmpty = hasFilters && capsules.length === 0;
  const achievements =
    stats && stats.totalMatches > 0
      ? computeAchievements(
          achievementsInputFromPublicStats(stats, {
            followingCount: profile.following_count,
            followersCount: profile.followers_count,
          }),
        )
      : [];
  const unlockedAchievements = countUnlockedAchievements(achievements);

  return (
    <Shell>
      <div className="space-y-5 sm:space-y-8">
        <PublicProfileHeader
          profile={profile}
          displayName={displayName}
          location={location}
          diaryTotal={diaryTotal}
          unlockedAchievements={unlockedAchievements}
          collectionsCount={collectionsData?.collections?.length ?? 0}
          isOwnProfile={isOwnProfile}
          isBlockedByMe={isBlockedByMe}
          user={user}
          loginTo={loginTo}
        />

        {isBlockedByMe ? (
          <EmptyState
            title="Has bloqueado a este usuario"
            description="No verás su perfil ni Capsules. Puedes desbloquearlo cuando quieras."
          />
        ) : null}

        {!isBlockedByMe && stats && stats.totalMatches > 0 ? (
          <PublicWrappedSummary name={displayName} stats={stats} />
        ) : null}

        {!isBlockedByMe && achievements.length > 0 ? (
          <AchievementsSection
            achievements={achievements}
            title="Logros"
            subtitle={
              unlockedAchievements === 0
                ? undefined
                : `${unlockedAchievements} de ${achievements.length} desbloqueados`
            }
          />
        ) : null}

        <PublicCollectionsSections
          profile={profile}
          featuredCollection={featuredCollection}
          collections={collectionsData?.collections}
          isOwnProfile={isOwnProfile}
          isBlockedByMe={isBlockedByMe}
          viewerUserId={user?.id}
        />

        {!isBlockedByMe && diaryEmpty ? (
          <PublicDiaryEmptyState isOwnProfile={isOwnProfile} />
        ) : null}

        {!isBlockedByMe && !diaryEmpty ? (
          <PublicDiaryCapsulesSection
            total={total}
            years={years}
            availableTags={availableTags}
            qDraft={qDraft}
            year={year}
            ratingMin={ratingMin}
            watchContext={watchContext}
            tag={tag}
            query={{
              hasFilters,
              isLoading,
              isUpdating: isFetching && !isFetchingNextPage,
              isFetchingNextPage,
              filterEmpty,
              hasNextPage: Boolean(hasNextPage),
            }}
            capsules={capsules}
            userId={user?.id}
            author={profile}
            onQDraftChange={setQDraft}
            patchParams={patchParams}
            clearFilters={clearFilters}
            fetchNextPage={fetchNextPage}
          />
        ) : null}
      </div>
    </Shell>
  );
}
