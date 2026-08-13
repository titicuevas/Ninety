import { Link } from 'react-router-dom';
import { Activity, Bell, Compass, Library, Newspaper, User, UserPlus, Users } from 'lucide-react';
import { PeopleResultRow } from '@/components/PeopleSearchPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCapsuleFeed } from '@/hooks/useCapsules';
import { useDiscoverCollections } from '@/hooks/useDiscoverCollections';
import { useDiscoverProfiles } from '@/hooks/useDiscoverProfiles';
import { useUnreadCount } from '@/hooks/useNotifications';
import { feedPath } from '@/lib/feedParams';
import { formatRelativeTime } from '@/lib/format';
import { publicProfilePath } from '@/lib/profilePath';
import type { FeedCapsule } from '@/types/capsule';

const PREVIEW_COUNT = 3;

function FeedPreviewRow({ capsule }: { capsule: FeedCapsule }) {
  const author = capsule.profiles?.display_name ?? capsule.profiles?.username ?? 'Aficionado';
  const href = publicProfilePath(capsule.profiles?.username);

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 sm:p-3.5">
      <div className="min-w-0">
        {href ? (
          <Link to={href} className="block truncate text-xs text-primary hover:underline">
            {author}
          </Link>
        ) : (
          <p className="truncate text-xs text-muted-foreground">{author}</p>
        )}
        <Link
          to={`/c/${capsule.id}`}
          className="mt-0.5 block truncate font-medium hover:text-primary hover:underline"
        >
          {capsule.home_team_name} vs {capsule.away_team_name}
        </Link>
      </div>
      <time
        className="shrink-0 text-xs text-muted-foreground"
        dateTime={capsule.created_at}
      >
        {formatRelativeTime(capsule.created_at)}
      </time>
    </li>
  );
}

function FeedPreviewSkeleton() {
  return (
    <ul className="space-y-2" role="status" aria-label="Cargando actividad">
      {Array.from({ length: 2 }, (_, i) => (
        <li key={i} className="rounded-xl border border-border p-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-48 max-w-full" />
        </li>
      ))}
    </ul>
  );
}

type HomeSocialHubProps = {
  username?: string | null;
};

/** Atajos sociales + preview del feed (o sugerencias si está vacío). */
export function HomeSocialHub({ username }: HomeSocialHubProps) {
  const unread = useUnreadCount();
  const { data: feedData, isLoading: feedLoading } = useCapsuleFeed('following', 'recent');
  const preview = feedData?.pages[0]?.capsules.slice(0, PREVIEW_COUNT) ?? [];
  const feedEmpty = !feedLoading && preview.length === 0;
  const { data: discoverData } = useDiscoverProfiles(feedEmpty);
  const { data: discoverCollectionsData } = useDiscoverCollections(feedEmpty);
  const suggestions = (discoverData?.profiles ?? [])
    .filter((p) => p.username && !p.followed_by_me)
    .slice(0, PREVIEW_COUNT);
  const collectionPreview = (discoverCollectionsData?.collections ?? []).slice(0, PREVIEW_COUNT);

  const unreadLabel = unread > 9 ? '9+' : String(unread);
  const profileHref = publicProfilePath(username);
  const followingHref = profileHref ? `${profileHref}/following` : null;
  const followersHref = profileHref ? `${profileHref}/followers` : null;

  return (
    <section className="space-y-4" aria-labelledby="home-social-heading">
      <div>
        <h2 id="home-social-heading" className="text-lg font-semibold tracking-tight sm:text-xl">
          Comunidad
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona a quién sigues, encuentra aficionados y entra al feed.
        </p>
      </div>

      <nav aria-label="Atajos sociales" className="flex flex-wrap gap-2">
        {followingHref ? (
          <Button asChild size="sm">
            <Link to={followingHref}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Siguiendo
            </Link>
          </Button>
        ) : null}
        <Button asChild variant={followingHref ? 'secondary' : 'default'} size="sm">
          <Link to="/search?tab=people">
            <Users className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Aficionados
          </Link>
        </Button>
        {followersHref ? (
          <Button asChild variant="secondary" size="sm">
            <Link to={followersHref}>
              <Users className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Seguidores
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary" size="sm">
          <Link to={feedPath()}>
            <Newspaper className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Feed
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to="/activity">
            <Activity className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Actividad
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to={feedPath('explore')}>
            <Compass className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Explorar
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to="/collections">
            <Library className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Colecciones
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to="/notifications">
            <Bell className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Notificaciones
            {unread > 0 ? (
              <span className="ml-1.5 rounded-md bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">
                {unreadLabel}
              </span>
            ) : null}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/profile">
            <User className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Editar perfil
          </Link>
        </Button>
      </nav>

      {followingHref ? (
        <p className="text-sm text-muted-foreground">
          En{' '}
          <Link to={followingHref} className="font-medium text-primary hover:underline">
            Siguiendo
          </Link>{' '}
          puedes dejar de seguir a quien ya no quieras ver en el feed.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Elige un username en{' '}
          <Link to="/profile" className="font-medium text-primary hover:underline">
            Editar perfil
          </Link>{' '}
          para abrir tus listas de siguiendo y seguidores.
        </p>
      )}

      {feedLoading ? <FeedPreviewSkeleton /> : null}

      {!feedLoading && preview.length > 0 ? (
        <div className="space-y-3">
          <ul className="space-y-2">
            {preview.map((capsule) => (
              <FeedPreviewRow key={capsule.id} capsule={capsule} />
            ))}
          </ul>
          <Button asChild variant="ghost" size="sm" className="px-0 text-primary">
            <Link to={feedPath()}>Ver feed completo</Link>
          </Button>
        </div>
      ) : null}

      {feedEmpty && collectionPreview.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-primary uppercase">
            Listas para descubrir
          </h3>
          <p className="text-sm text-muted-foreground">
            Colecciones públicas con Capsules para empezar sin follows.
          </p>
          <ul className="space-y-2">
            {collectionPreview.map((collection) => {
              const username = collection.author.username;
              const href =
                username && collection.slug
                  ? `/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(collection.slug)}`
                  : null;
              return (
                <li
                  key={collection.id}
                  className="rounded-xl border border-border bg-card p-3 sm:p-3.5"
                >
                  {href ? (
                    <Link
                      to={href}
                      className="block truncate font-medium hover:text-primary hover:underline"
                    >
                      {collection.name}
                    </Link>
                  ) : (
                    <p className="truncate font-medium">{collection.name}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {collection.items_count ?? 0} Capsules
                    {username ? ` · @${username}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
          <Button asChild variant="ghost" size="sm" className="px-0 text-primary">
            <Link to="/collections/explore">Ver más listas</Link>
          </Button>
        </div>
      ) : null}

      {feedEmpty && suggestions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-primary uppercase">
            Aficionados sugeridos
          </h3>
          <p className="text-sm text-muted-foreground">
            Perfiles con actividad pública; si compartes equipo o ciudad, van primero.
          </p>
          <ul className="space-y-2">
            {suggestions.map((profile) => (
              <PeopleResultRow key={profile.id} profile={profile} />
            ))}
          </ul>
          <Button asChild variant="ghost" size="sm" className="px-0 text-primary">
            <Link to="/search?tab=people">Buscar más aficionados</Link>
          </Button>
        </div>
      ) : null}

      {feedEmpty && suggestions.length === 0 && collectionPreview.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Descubre aficionados y listas públicas para llenar tu feed.{' '}
          <Link to={feedPath('explore')} className="text-primary hover:underline">
            Explorar comunidad
          </Link>
          {' · '}
          <Link to="/collections/explore" className="text-primary hover:underline">
            Explorar listas
          </Link>
          {' · '}
          <Link to="/search?tab=people" className="text-primary hover:underline">
            Buscar gente
          </Link>
        </p>
      ) : null}
    </section>
  );
}
