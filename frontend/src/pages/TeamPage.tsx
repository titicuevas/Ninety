import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { FollowsYouBadge } from '@/components/FollowsYouBadge';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { Layout } from '@/components/Layout';
import { PeopleListSkeleton } from '@/components/ListSkeletons';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useTeamFansInfinite } from '@/hooks/useTeamFans';
import { isAutoUsername } from '@/lib/profileHelpers';
import { profilePath } from '@/lib/profilePath';
import type { Profile } from '@/types/profile';

function TeamFanRow({
  profile,
  currentUserId,
}: {
  profile: Profile;
  currentUserId?: string;
}) {
  const username = profile.username!;
  const name = profile.display_name ?? username;
  const location = [profile.city, profile.country].filter(Boolean).join(', ');
  const isSelf = !!currentUserId && profile.id === currentUserId;
  const canLink = !isAutoUsername(username);
  const href = canLink ? profilePath(username) : null;
  const activity = profile.public_capsules_count ?? 0;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <Link to={href} className="font-medium text-foreground hover:text-primary hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{name}</span>
          )}
          {isSelf ? (
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tú
            </span>
          ) : null}
          {!isSelf && profile.follows_me ? <FollowsYouBadge /> : null}
        </div>
        {canLink ? <p className="text-sm text-muted-foreground">@{username}</p> : null}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[
            profile.favorite_team,
            location,
            activity > 0
              ? `${activity} ${activity === 1 ? 'Capsule reciente' : 'Capsules recientes'}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Aficionado Ninety'}
        </p>
      </div>

      {!isSelf && href ? (
        <FollowButton
          username={username}
          followedByMe={!!profile.followed_by_me}
          followsMe={!!profile.follows_me}
          size="compact"
        />
      ) : null}
    </li>
  );
}

export function TeamPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useTeamFansInfinite(slug);

  const teamName = data?.pages[0]?.team ?? slug?.replace(/-/g, ' ') ?? 'Equipo';
  const total = data?.pages[0]?.total ?? 0;
  useDocumentTitle(teamName ? `Fans · ${teamName}` : 'Fans del equipo');

  const profiles = useMemo(
    () => data?.pages.flatMap((page) => page.profiles ?? []) ?? [],
    [data],
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl space-y-6 py-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <PeopleListSkeleton count={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-xl space-y-5 py-2 sm:space-y-6">
        <div className="space-y-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 h-9 w-9 px-0 text-muted-foreground sm:w-auto sm:px-3"
          >
            <Link to="/search?tab=people">
              <ArrowLeft className="h-4 w-4 sm:mr-1.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Aficionados</span>
            </Link>
          </Button>

          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Trophy className="hidden h-6 w-6 shrink-0 text-primary sm:block" aria-hidden />
              {teamName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total === 1 ? '1 aficionado' : `${total} aficionados`}
            </p>
          </div>
        </div>

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudo cargar el equipo'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isError && profiles.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin aficionados aún"
            description={`Nadie tiene «${teamName}» como club favorito.`}
          >
            <Button asChild>
              <Link to="/search?tab=people">Buscar aficionados</Link>
            </Button>
          </EmptyState>
        ) : null}

        {!isError && profiles.length > 0 ? (
          <>
            <ul className="space-y-2">
              {profiles.map((profile) => (
                <TeamFanRow
                  key={`${profile.id}:${profile.followed_by_me ? '1' : '0'}:${profile.follows_me ? '1' : '0'}`}
                  profile={profile}
                  currentUserId={user?.id}
                />
              ))}
            </ul>
            <InfiniteScrollSentinel
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </>
        ) : null}
      </div>
    </Layout>
  );
}
