import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { Layout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { useFollowListInfinite, type FollowListKind } from '@/hooks/useFollowList';
import { useProfile } from '@/hooks/useProfile';
import { profilePath } from '@/lib/profilePath';
import type { Profile } from '@/types/profile';

function FollowListRow({
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
        <Link to={profilePath(username)} className="font-medium text-foreground hover:text-primary hover:underline">
          {name}
        </Link>
        <p className="text-sm text-muted-foreground">@{username}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[profile.favorite_team, location].filter(Boolean).join(' · ') || 'Aficionado Ninety'}
        </p>
      </div>

      {!isSelf && username && currentUserId ? (
        <FollowButton username={username} followedByMe={profile.followed_by_me} />
      ) : !isSelf && username && !currentUserId ? (
        <Button asChild size="sm" variant="secondary" className="shrink-0">
          <Link to="/login">Seguir</Link>
        </Button>
      ) : null}
    </li>
  );
}

function FollowListPage({ kind }: { kind: FollowListKind }) {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { data: me } = useProfile();
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useFollowListInfinite(username, kind);
  const Shell = user ? Layout : PublicLayout;

  const title = kind === 'followers' ? 'Seguidores' : 'Siguiendo';
  const emptyCopy =
    kind === 'followers' ? 'Todavía no tiene seguidores.' : 'Todavía no sigue a nadie.';
  const isOwnList =
    !!user &&
    !!username &&
    !!me?.username &&
    me.username.toLowerCase() === username.toLowerCase();

  const profiles = useMemo(
    () => data?.pages.flatMap((page) => page.profiles) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? profiles.length;

  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Shell>
    );
  }

  if (isError || !username) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-xl font-semibold">No se pudo cargar la lista</h1>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Inténtalo de nuevo más tarde.'}
          </p>
          <Button asChild variant="secondary">
            <Link to={username ? profilePath(username) : user ? '/feed' : '/'}>Volver</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const otherKind: FollowListKind = kind === 'followers' ? 'following' : 'followers';
  const otherLabel = otherKind === 'followers' ? 'Seguidores' : 'Siguiendo';

  return (
    <Shell>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
            <Link to={profilePath(username)}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              @{username}
            </Link>
          </Button>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {total === 1 ? '1 aficionado' : `${total} aficionados`}
              </p>
            </div>
            <div
              className="flex gap-1 rounded-lg bg-secondary p-1"
              role="tablist"
              aria-label="Tipo de lista"
            >
              <Link
                to={`/u/${encodeURIComponent(username)}/followers`}
                role="tab"
                aria-selected={kind === 'followers'}
                className={
                  kind === 'followers'
                    ? 'rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm'
                    : 'rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                }
              >
                Seguidores
              </Link>
              <Link
                to={`/u/${encodeURIComponent(username)}/following`}
                role="tab"
                aria-selected={kind === 'following'}
                className={
                  kind === 'following'
                    ? 'rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm'
                    : 'rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
                }
              >
                Siguiendo
              </Link>
            </div>
          </div>
        </div>

        {profiles.length > 0 ? (
          <div className="space-y-4">
            <ul className="space-y-2">
              {profiles.map((profile) => (
                <FollowListRow key={profile.id} profile={profile} currentUserId={user?.id} />
              ))}
            </ul>
            {hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  loading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  Cargar más
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={emptyCopy}
            description={
              isOwnList
                ? kind === 'following'
                  ? 'Busca aficionados para empezar a seguir partidos de tu gente.'
                  : 'Comparte tu perfil para que otros te encuentren.'
                : `Mira también ${otherLabel.toLowerCase()}.`
            }
          >
            {isOwnList && kind === 'following' ? (
              <Button asChild>
                <Link to="/search?tab=people">Buscar aficionados</Link>
              </Button>
            ) : null}
            {isOwnList && kind === 'followers' && me?.username ? (
              <Button asChild variant="secondary">
                <Link to={profilePath(me.username)}>Ver tu perfil</Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link to={`/u/${encodeURIComponent(username)}/${otherKind}`}>
                Ver {otherLabel.toLowerCase()}
              </Link>
            </Button>
          </EmptyState>
        )}
      </div>
    </Shell>
  );
}

export function FollowersPage() {
  return <FollowListPage kind="followers" />;
}

export function FollowingPage() {
  return <FollowListPage kind="following" />;
}
