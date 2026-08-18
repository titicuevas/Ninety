import { Link } from 'react-router-dom';
import { Activity, Heart, Library, MessageCircle, Ticket, Users } from 'lucide-react';
import { ActivityTypeFiltersBar } from '@/components/ActivityTypeFiltersBar';
import { CapsuleAlsoCommented } from '@/components/CapsuleAlsoCommented';
import { CapsuleAlsoLiked } from '@/components/CapsuleAlsoLiked';
import { CapsuleAlsoWatched } from '@/components/CapsuleAlsoWatched';
import { CollectionAlsoCommented } from '@/components/CollectionAlsoCommented';
import { CollectionAlsoLiked } from '@/components/CollectionAlsoLiked';
import { EmptyState } from '@/components/EmptyState';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { Layout } from '@/components/Layout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useActivityFilterParams } from '@/hooks/useActivityFilterParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFollowActivity } from '@/hooks/useFollowActivity';
import {
  activityDocumentTitle,
  activityTypeEmptyCopy,
  hasActivityTypeFilter,
} from '@/lib/activityTypeFilter';
import { followActivityAlsoCommented, followActivityAlsoLiked, followActivityAlsoWatched, followActivityEngagementMeta } from '@/lib/followActivitySummary';
import { formatRelativeTime } from '@/lib/format';
import { publicProfilePath } from '@/lib/profilePath';
import type { FollowActivityEvent } from '@/types/activity';

function ActivityListSkeleton() {
  return (
    <ul className={capsuleCardListClass} role="status" aria-label="Cargando actividad">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="rounded-xl border border-border p-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-5 w-52 max-w-full" />
          <Skeleton className="mt-2 h-3 w-20" />
        </li>
      ))}
    </ul>
  );
}

function ActorLink({ event }: { event: FollowActivityEvent }) {
  const name = event.actor.display_name ?? event.actor.username ?? 'Aficionado';
  const href = publicProfilePath(event.actor.username);

  if (href) {
    return (
      <Link to={href} className="font-medium text-primary hover:underline">
        {name}
      </Link>
    );
  }

  return <span className="font-medium text-foreground">{name}</span>;
}

function ActivityAlsoFollowedLines({ event }: { event: FollowActivityEvent }) {
  const watched = followActivityAlsoWatched(event);
  const liked = followActivityAlsoLiked(event);
  const commented = followActivityAlsoCommented(event);

  if (
    event.type === 'capsule' ||
    event.type === 'capsule_like' ||
    event.type === 'capsule_comment'
  ) {
    return (
      <>
        {watched.length > 0 ? (
          <CapsuleAlsoWatched people={watched} className="mt-1 text-xs" />
        ) : null}
        <CapsuleAlsoLiked
          capsuleId={event.capsule.id}
          people={liked}
          exceptUserId={event.capsule.user_id}
          className="mt-1 text-xs"
        />
        <CapsuleAlsoCommented
          capsuleId={event.capsule.id}
          people={commented}
          exceptUserId={event.capsule.user_id}
          className="mt-1 text-xs"
        />
      </>
    );
  }

  return (
    <>
      <CollectionAlsoLiked
        collectionId={event.collection.id}
        people={liked}
        className="mt-1 text-xs"
      />
      <CollectionAlsoCommented
        collectionId={event.collection.id}
        people={commented}
        className="mt-1 text-xs"
      />
    </>
  );
}

function ActivityEngagementLine({ event }: { event: FollowActivityEvent }) {
  const label = followActivityEngagementMeta(event);
  if (!label) return null;
  return <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>;
}

function CapsuleActivityRow({
  event,
}: {
  event: Extract<FollowActivityEvent, { type: 'capsule' | 'capsule_like' | 'capsule_comment' }>;
}) {
  const match = `${event.capsule.home_team_name} vs ${event.capsule.away_team_name}`;
  const liked = event.type === 'capsule_like';
  const commented = event.type === 'capsule_comment';
  const href = commented ? `/c/${event.capsule.id}#comments` : `/c/${event.capsule.id}`;
  const action = commented
    ? 'comentó una Capsule'
    : liked
      ? 'le dio me gusta a una Capsule'
      : 'publicó una Capsule';

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <article className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
          aria-hidden
        >
          {commented ? (
            <MessageCircle className="h-4 w-4" />
          ) : liked ? (
            <Heart className="h-4 w-4" />
          ) : (
            <Ticket className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <ActorLink event={event} /> {action}
          </p>
          <Link
            to={href}
            className="mt-1 block truncate font-medium text-foreground hover:text-primary hover:underline"
          >
            {match}
          </Link>
          <ActivityEngagementLine event={event} />
          <ActivityAlsoFollowedLines event={event} />
          {commented ? (
            <p className="mt-1 line-clamp-2 text-sm text-foreground/90">{event.comment_body}</p>
          ) : null}
          {event.capsule.competition_name ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {event.capsule.competition_name}
            </p>
          ) : null}
          <time
            className="mt-2 block text-xs text-muted-foreground"
            dateTime={event.occurred_at}
          >
            {formatRelativeTime(event.occurred_at)}
          </time>
        </div>
      </article>
    </li>
  );
}

function CollectionActivityRow({
  event,
}: {
  event: Extract<
    FollowActivityEvent,
    { type: 'collection' | 'collection_like' | 'collection_comment' }
  >;
}) {
  const liked = event.type === 'collection_like';
  const commented = event.type === 'collection_comment';
  const username = event.collection.author_username ?? event.actor.username;
  const href =
    username && event.collection.slug
      ? `/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(event.collection.slug)}`
      : null;
  const action = commented
    ? 'comentó una lista'
    : liked
      ? 'le dio me gusta a una lista'
      : 'creó una lista';

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <article className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          aria-hidden
        >
          {commented ? (
            <MessageCircle className="h-4 w-4" />
          ) : liked ? (
            <Heart className="h-4 w-4" />
          ) : (
            <Library className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <ActorLink event={event} /> {action}
          </p>
          {href ? (
            <Link
              to={href}
              className="mt-1 block truncate font-medium text-foreground hover:text-primary hover:underline"
            >
              {event.collection.name}
            </Link>
          ) : (
            <p className="mt-1 truncate font-medium">{event.collection.name}</p>
          )}
          <ActivityEngagementLine event={event} />
          <ActivityAlsoFollowedLines event={event} />
          {commented ? (
            <p className="mt-1 line-clamp-2 text-sm text-foreground/90">{event.comment_body}</p>
          ) : null}
          <time
            className="mt-2 block text-xs text-muted-foreground"
            dateTime={event.occurred_at}
          >
            {formatRelativeTime(event.occurred_at)}
          </time>
        </div>
      </article>
    </li>
  );
}

function ActivityRow({ event }: { event: FollowActivityEvent }) {
  if (
    event.type === 'collection' ||
    event.type === 'collection_like' ||
    event.type === 'collection_comment'
  ) {
    return <CollectionActivityRow event={event} />;
  }
  return <CapsuleActivityRow event={event} />;
}

export function ActivityPage() {
  const { type, setType, clearType } = useActivityFilterParams();
  const typeFilterActive = hasActivityTypeFilter(type);
  useDocumentTitle(activityDocumentTitle(type));
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
  } = useFollowActivity(type);

  const events = data?.pages.flatMap((page) => page.events ?? []) ?? [];
  const followingCount = data?.pages[0]?.following_count ?? 0;
  const isEmpty = !isLoading && !isError && events.length === 0;
  const filterEmpty = isEmpty && typeFilterActive && followingCount > 0;
  const filterEmptyCopy = type ? activityTypeEmptyCopy(type) : null;

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        <section className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Actividad</h1>
            {followingCount > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Siguiendo a {followingCount} {followingCount === 1 ? 'persona' : 'personas'}
              </p>
            ) : null}
          </div>
          {followingCount === 0 ? (
            <Button asChild variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to="/search?tab=people">
                <Users className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Seguir aficionados</span>
              </Link>
            </Button>
          ) : null}
        </section>

        {followingCount > 0 ? (
          <ActivityTypeFiltersBar type={type} onTypeChange={setType} onClear={clearType} />
        ) : null}

        {isLoading ? <ActivityListSkeleton /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudo cargar la actividad'}
            onRetry={() => void refetch()}
            loading={isRefetching}
          />
        ) : null}

        {filterEmpty && filterEmptyCopy ? (
          <EmptyState
            icon={Activity}
            title={filterEmptyCopy.title}
            description={filterEmptyCopy.description}
          >
            <Button type="button" variant="secondary" size="sm" onClick={clearType}>
              Ver todas
            </Button>
          </EmptyState>
        ) : isEmpty ? (
          <EmptyState
            icon={Activity}
            title={
              followingCount === 0
                ? 'Todavía no sigues a nadie'
                : 'Sin actividad reciente'
            }
            description={
              followingCount === 0
                ? 'Sigue aficionados para ver aquí sus Capsules y listas.'
                : 'Cuando publiquen Capsules o listas, comenten o den me gusta, aparecerán aquí.'
            }
          >
            {followingCount === 0 ? (
              <Button asChild size="sm">
                <Link to="/search?tab=people">Buscar aficionados</Link>
              </Button>
            ) : null}
          </EmptyState>
        ) : null}

        {!isLoading && !isError && events.length > 0 ? (
          <>
            <ul className={capsuleCardListClass}>
              {events.map((event) => (
                <ActivityRow key={event.id} event={event} />
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
