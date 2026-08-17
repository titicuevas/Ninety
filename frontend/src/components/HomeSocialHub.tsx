import { Link } from 'react-router-dom';
import { UserPlus, Users } from 'lucide-react';
import { ActivityShortcutLink } from '@/components/ActivityShortcutLink';
import { PeopleResultRow } from '@/components/PeopleSearchPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCapsuleFeed } from '@/hooks/useCapsules';
import { useDiscoverCollections } from '@/hooks/useDiscoverCollections';
import { useDiscoverProfiles } from '@/hooks/useDiscoverProfiles';
import { useFollowActivity } from '@/hooks/useFollowActivity';
import { summarizeFollowActivityEvent } from '@/lib/followActivitySummary';
import { formatRelativeTime } from '@/lib/format';
import { publicProfilePath } from '@/lib/profilePath';
import type { FeedCapsule } from '@/types/capsule';
import type { FollowActivityEvent } from '@/types/activity';

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

function ActivityPreviewRow({ event }: { event: FollowActivityEvent }) {
  const actor = event.actor.display_name ?? event.actor.username ?? 'Aficionado';
  const actorHref = publicProfilePath(event.actor.username);
  const summary = summarizeFollowActivityEvent(event);

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 sm:p-3.5">
      <p className="min-w-0 text-sm text-muted-foreground">
        {actorHref ? (
          <Link to={actorHref} className="font-medium text-primary hover:underline">
            {actor}
          </Link>
        ) : (
          <span className="font-medium text-foreground">{actor}</span>
        )}{' '}
        {summary.action}{' '}
        <Link to={summary.href} className="font-medium text-foreground hover:text-primary hover:underline">
          {summary.label}
        </Link>
      </p>
      <time
        className="shrink-0 text-xs text-muted-foreground"
        dateTime={event.occurred_at}
      >
        {formatRelativeTime(event.occurred_at)}
      </time>
    </li>
  );
}

function ActivityPreviewSkeleton() {
  return (
    <ul className="space-y-2" role="status" aria-label="Cargando actividad reciente">
      {Array.from({ length: 2 }, (_, i) => (
        <li key={i} className="rounded-xl border border-border p-3">
          <Skeleton className="h-4 w-full max-w-md" />
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
  const { data: feedData, isLoading: feedLoading } = useCapsuleFeed('following', 'recent');
  const { data: activityData, isLoading: activityLoading } = useFollowActivity();
  const preview = feedData?.pages[0]?.capsules.slice(0, PREVIEW_COUNT) ?? [];
  const activityPreview = activityData?.pages[0]?.events.slice(0, PREVIEW_COUNT) ?? [];
  const followingCount = activityData?.pages[0]?.following_count ?? 0;
  const feedEmpty = !feedLoading && preview.length === 0;
  const showActivityPreview = followingCount > 0 && (activityLoading || activityPreview.length > 0);
  const { data: discoverData } = useDiscoverProfiles(feedEmpty);
  const { data: discoverCollectionsData } = useDiscoverCollections(feedEmpty);
  const suggestions = (discoverData?.profiles ?? [])
    .filter((p) => p.username && !p.followed_by_me)
    .slice(0, PREVIEW_COUNT);
  const collectionPreview = (discoverCollectionsData?.collections ?? []).slice(0, PREVIEW_COUNT);

  const profileHref = publicProfilePath(username);
  const followingHref = profileHref ? `${profileHref}/following` : null;
  const followersHref = profileHref ? `${profileHref}/followers` : null;

  return (
    <section className="space-y-4" aria-labelledby="home-social-heading">
      <h2 id="home-social-heading" className="text-lg font-semibold tracking-tight sm:text-xl">
        Comunidad
      </h2>

      <nav aria-label="Atajos sociales" className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
          <Link to="/search?tab=people">
            <Users className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
            <span className="sr-only sm:not-sr-only">Aficionados</span>
          </Link>
        </Button>
        <ActivityShortcutLink variant="secondary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" />
        {followingHref ? (
          <Button asChild variant="secondary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
            <Link to={followingHref}>
              <UserPlus className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Siguiendo</span>
            </Link>
          </Button>
        ) : null}
        {followersHref ? (
          <Button asChild variant="secondary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
            <Link to={followersHref}>
              <Users className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Seguidores</span>
            </Link>
          </Button>
        ) : null}
      </nav>

      {followingHref ? null : (
        <p className="text-sm text-muted-foreground">
          Elige un username en{' '}
          <Link to="/profile" className="font-medium text-primary hover:underline">
            Editar perfil
          </Link>{' '}
          para abrir tus listas de siguiendo y seguidores.
        </p>
      )}

      {showActivityPreview ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-primary uppercase">
              Actividad reciente
            </h3>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-primary">
              <Link to="/activity">Ver toda la actividad</Link>
            </Button>
          </div>
          {activityLoading ? <ActivityPreviewSkeleton /> : null}
          {!activityLoading && activityPreview.length > 0 ? (
            <ul className="space-y-2">
              {activityPreview.map((event) => (
                <ActivityPreviewRow key={event.id} event={event} />
              ))}
            </ul>
          ) : null}
          {!activityLoading && activityPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin actividad reciente.{' '}
              <Link to="/activity" className="text-primary hover:underline">
                Abrir actividad
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {feedLoading ? <FeedPreviewSkeleton /> : null}

      {!feedLoading && preview.length > 0 ? (
        <ul className="space-y-2">
          {preview.map((capsule) => (
            <FeedPreviewRow key={capsule.id} capsule={capsule} />
          ))}
        </ul>
      ) : null}

      {feedEmpty && collectionPreview.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-primary uppercase">
            Listas para descubrir
          </h3>
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
          Sigue aficionados para llenar el feed.{' '}
          <Link to="/search?tab=people" className="text-primary hover:underline">
            Buscar gente
          </Link>
        </p>
      ) : null}
    </section>
  );
}
