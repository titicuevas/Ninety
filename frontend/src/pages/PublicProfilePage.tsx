import { Link, useParams } from 'react-router-dom';
import { Library, MapPin, Swords, Trophy } from 'lucide-react';
import { AchievementsSection } from '@/components/AchievementsSection';
import { CapsuleDiaryFilters } from '@/components/CapsuleDiaryFilters';
import { CapsuleEngagementBar } from '@/components/CapsuleEngagementBar';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { FollowsYouBadge } from '@/components/FollowsYouBadge';
import { BlockUserButton } from '@/components/BlockUserButton';
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
import { publicProfileUrl } from '@/lib/siteUrl';
import { teamPathFromFavorite } from '@/lib/teamPath';
import type { Capsule } from '@/types/capsule';

function PublicCapsuleCard({
  capsule,
  currentUserId,
}: {
  capsule: Capsule & { likes_count?: number; liked_by_me?: boolean; comments_count?: number };
  currentUserId?: string;
}) {
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;

  return (
    <CapsuleListCard
      capsule={capsule}
      showWatchedDate
      footerBordered
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
  } = usePublicProfile(username, { q, year, ratingMin, watchContext });

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
  const capsules = isBlockedByMe ? [] : (data?.pages.flatMap((page) => page.capsules) ?? []);
  const total = isBlockedByMe ? 0 : (data?.pages[0]?.total ?? capsules.length);
  const stats = isBlockedByMe ? undefined : data?.pages[0]?.stats;
  const years = isBlockedByMe ? [] : (data?.pages[0]?.years ?? []);
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
      <div className="space-y-8">
        <section className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
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

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
            {isOwnProfile ? (
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link to="/profile">Editar perfil</Link>
              </Button>
            ) : profile.username && user ? (
              isBlockedByMe ? (
                <>
                  <BlockUserButton
                    username={profile.username}
                    blockedByMe
                    className="w-full sm:w-auto"
                  />
                  <ReportContentButton
                    targetType="user"
                    targetId={profile.id}
                    username={profile.username}
                    className="w-full sm:w-auto"
                  />
                </>
              ) : (
                <>
                  <FollowButton
                    username={profile.username}
                    followedByMe={profile.followed_by_me}
                    followsMe={profile.follows_me}
                    className="w-full sm:w-auto"
                  />
                  <MuteUserButton
                    username={profile.username}
                    mutedByMe={profile.muted_by_me}
                    className="w-full sm:w-auto"
                  />
                  <BlockUserButton
                    username={profile.username}
                    blockedByMe={profile.blocked_by_me}
                    className="w-full sm:w-auto"
                  />
                  <ReportContentButton
                    targetType="user"
                    targetId={profile.id}
                    username={profile.username}
                    className="w-full sm:w-auto"
                  />
                </>
              )
            ) : profile.username ? (
              <Button asChild className="w-full sm:w-auto">
                <Link to={loginTo}>Inicia sesión para seguir</Link>
              </Button>
            ) : null}
            {!isOwnProfile && !isBlockedByMe && profile.username && !isAutoUsername(profile.username) ? (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={`/u/${encodeURIComponent(profile.username)}/vs`}>
                  <Swords className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Cara a cara
                </Link>
              </Button>
            ) : null}
            {!isBlockedByMe && profile.username && !isAutoUsername(profile.username) ? (
              <ShareProfileButton
                username={profile.username}
                displayName={displayName}
                className="w-full sm:w-auto"
              />
            ) : null}
          </div>
        </section>

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

        {!isBlockedByMe && (collectionsData?.collections.length ?? 0) > 0 ? (
          <section className="space-y-3" aria-labelledby="public-collections-heading">
            <div>
              <h2
                id="public-collections-heading"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <Library className="h-5 w-5 text-primary" aria-hidden />
                Colecciones
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Listas curadas del diario — clásicos, viajes, noches grandes.
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {collectionsData!.collections.map((col) => (
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
                        {col.items_count ?? 0}{' '}
                        {(col.items_count ?? 0) === 1 ? 'partido' : 'partidos'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {isOwnProfile ? (
              <Button asChild variant="secondary" size="sm">
                <Link to="/collections">Gestionar colecciones</Link>
              </Button>
            ) : null}
          </section>
        ) : !isBlockedByMe && isOwnProfile ? (
          <section className="space-y-3" aria-labelledby="public-collections-empty-heading">
            <div>
              <h2
                id="public-collections-empty-heading"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <Library className="h-5 w-5 text-primary" aria-hidden />
                Colecciones
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Agrupa Capsules en listas compartibles (estilo Letterboxd) y enlázalas desde tu perfil.
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/collections">
                <Library className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Crear tu primera colección
              </Link>
            </Button>
          </section>
        ) : null}

        {!isBlockedByMe && !diaryEmpty ? (
          <CapsuleDiaryFilters
            years={years}
            searchAriaLabel="Buscar en el diario público"
            ariaLabel="Filtros del diario público"
            qDraft={qDraft}
            year={year}
            ratingMin={ratingMin}
            watchContext={watchContext}
            hasFilters={hasFilters}
            isUpdating={isFetching && !isFetchingNextPage}
            onQDraftChange={setQDraft}
            patchParams={patchParams}
            clearFilters={clearFilters}
          />
        ) : null}

        {!isBlockedByMe && filterEmpty ? (
          <EmptyState
            title="Ningún partido con estos filtros"
            description="Prueba otro año, valoración o limpia la búsqueda."
          >
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </EmptyState>
        ) : null}

        {!isBlockedByMe && capsules.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              Capsules
              {hasFilters ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {total} {total === 1 ? 'partido' : 'partidos'}
                </span>
              ) : null}
            </h2>
            {capsules.map((capsule) => (
              <PublicCapsuleCard key={capsule.id} capsule={capsule} currentUserId={user?.id} />
            ))}
            <InfiniteScrollSentinel
              hasNextPage={Boolean(hasNextPage)}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </section>
        ) : null}

        {!isBlockedByMe && diaryEmpty ? (
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
        ) : null}

        {!isBlockedByMe && profile.username ? (
          <p className="text-center text-xs text-muted-foreground">
            Perfil público ·{' '}
            <a href={publicProfileUrl(profile.username)} className="text-primary hover:underline">
              {publicProfileUrl(profile.username).replace(/^https?:\/\//, '')}
            </a>
          </p>
        ) : null}
      </div>
    </Shell>
  );
}
