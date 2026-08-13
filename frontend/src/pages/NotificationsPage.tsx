import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { AtSign, Bell, Heart, Library, UserPlus, MessageCircle } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { Layout } from '@/components/Layout';
import { MuteUserButton } from '@/components/MuteUserButton';
import { NotificationListSkeleton } from '@/components/ListSkeletons';
import { NotificationTypeFiltersBar } from '@/components/NotificationTypeFiltersBar';
import { PushAlertsPanel } from '@/components/PushAlertsPanel';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useNotifications,
  useMarkAllRead,
  useMarkNotificationsRead,
  useClearReadNotifications,
} from '@/hooks/useNotifications';
import { useNotificationFilterParams } from '@/hooks/useNotificationFilterParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  formatNotificationAriaLabel,
  formatNotificationMatchContext,
} from '@/lib/notificationCapsule';
import {
  digestActionText,
  digestFollowBackActor,
  digestUnreadIds,
  formatDigestActorNames,
  groupNotificationsForDigest,
  type DigestActor,
  type NotificationDigestGroup,
} from '@/lib/notificationDigest';
import {
  hasNotificationTypeFilter,
  notificationDocumentTitle,
  notificationTypeEmptyCopy,
} from '@/lib/notificationTypeFilter';
import { publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const iconMap = {
  like: Heart,
  collection_like: Library,
  follow: UserPlus,
  comment: MessageCircle,
  mention: AtSign,
} as const;

function StackedAvatars({ actors, type }: { actors: DigestActor[]; type: NotificationDigestGroup['type'] }) {
  const Icon = iconMap[type];
  const shown = actors.slice(0, 3);

  return (
    <span className="relative mt-0.5 shrink-0" aria-hidden>
      <span className="flex">
        {shown.map((actor, index) => {
          const name = actor.display_name || actor.username || '?';
          return (
            <span
              key={actor.id}
              className={cn('relative', index > 0 && '-ml-2')}
              style={{ zIndex: shown.length - index }}
            >
              {actor.avatar_url ? (
                <img
                  src={actor.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full border-2 border-background object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary text-sm font-bold text-primary-foreground">
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-secondary text-muted-foreground">
        <Icon className="h-2.5 w-2.5" />
      </span>
    </span>
  );
}

function CapsuleThumb({
  capsule,
}: {
  capsule: NonNullable<NotificationDigestGroup['capsule']>;
}) {
  const thumb = capsule.thumb_url;
  if (!thumb) return null;
  const alt = formatNotificationMatchContext(capsule);

  return (
    <img
      src={thumb}
      alt=""
      title={alt}
      className="mt-0.5 h-11 w-11 shrink-0 rounded-md border border-border object-cover"
      loading="lazy"
      decoding="async"
    />
  );
}

function DigestNotificationItem({
  group,
  onOpen,
}: {
  group: NotificationDigestGroup;
  onOpen?: (ids: string[]) => void;
}) {
  const actorNames = formatDigestActorNames(group.actors);
  const actionText = digestActionText(group.type, group.actors.length);
  const singleActorUsername =
    group.actors.length === 1 ? group.actors[0]?.username ?? null : null;
  const followBackActor = digestFollowBackActor(group);
  const followHref =
    group.type === 'follow' && group.actors.length === 1
      ? publicProfilePath(group.actors[0]?.username) ?? undefined
      : undefined;
  const link =
    followHref ??
    (group.type === 'collection_like' && group.collection_id
      ? `/collections/${group.collection_id}`
      : group.capsule_id
        ? group.type === 'comment' || group.type === 'mention'
          ? `/c/${group.capsule_id}#comments`
          : `/c/${group.capsule_id}`
        : undefined);
  const snippet =
    group.type === 'comment' || group.type === 'mention' ? group.latestBody : null;
  const matchLine = group.capsule
    ? formatNotificationMatchContext(group.capsule)
    : group.collection?.name
      ? group.collection.name
      : null;
  const ariaLabel = [
    formatNotificationAriaLabel({
      actorName: actorNames,
      actionText,
      capsule: group.capsule,
      snippet,
      unread: group.unread,
    }),
    group.collection?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  const content = (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-start gap-3 rounded-lg p-3 transition-colors',
        group.unread && 'bg-primary/5',
        link && 'hover:bg-secondary/60',
      )}
      data-testid="notification-digest-item"
      data-digest-key={group.key}
      data-digest-count={group.notifications.length}
    >
      <StackedAvatars actors={group.actors} type={group.type} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{actorNames}</span> {actionText}
        </p>
        {matchLine ? (
          <p
            className="mt-0.5 truncate text-sm font-medium text-foreground/80"
            data-testid="notification-match"
          >
            {matchLine}
          </p>
        ) : null}
        {snippet ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">«{snippet}»</p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(group.created_at)}</p>
      </div>
      {group.capsule ? <CapsuleThumb capsule={group.capsule} /> : null}
      {group.unread && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      )}
    </div>
  );

  const openGroup = () => {
    const ids = digestUnreadIds(group);
    if (ids.length > 0) onOpen?.(ids);
  };

  const rowActions =
    followBackActor || singleActorUsername ? (
      <div className="flex shrink-0 items-start gap-1 pt-2 pr-1">
        {followBackActor?.username ? (
          <FollowButton
            username={followBackActor.username}
            followedByMe={followBackActor.followed_by_me === true}
            followBack
            size="compact"
          />
        ) : null}
        {singleActorUsername ? <MuteUserButton username={singleActorUsername} size="icon" /> : null}
      </div>
    ) : null;

  if (link) {
    return (
      <div className="flex items-stretch gap-0 rounded-lg">
        <Link
          to={link}
          aria-label={ariaLabel}
          className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={openGroup}
        >
          {content}
        </Link>
        {rowActions}
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-0 rounded-lg">
      <button
        type="button"
        className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={ariaLabel}
        onClick={openGroup}
      >
        {content}
      </button>
      {rowActions}
    </div>
  );
}

export function NotificationsPage() {
  const { type, setType, clearType } = useNotificationFilterParams();
  const typeFilterActive = hasNotificationTypeFilter(type);
  useDocumentTitle(notificationDocumentTitle(type));
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(type);
  const markAll = useMarkAllRead();
  const markRead = useMarkNotificationsRead();
  const clearRead = useClearReadNotifications();
  const [clearOpen, setClearOpen] = useState(false);
  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];
  const digestGroups = useMemo(() => {
    const list = data?.pages.flatMap((page) => page.notifications) ?? [];
    return groupNotificationsForDigest(list);
  }, [data]);
  const unread = data?.pages[0]?.unread_count ?? 0;
  const hasRead = notifications.some((n) => n.read);
  const isEmpty = !isLoading && notifications.length === 0;
  const filterEmpty = isEmpty && typeFilterActive;
  const filterEmptyCopy = type ? notificationTypeEmptyCopy(type) : null;

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        <header
          className="flex flex-wrap items-center justify-between gap-3"
          aria-labelledby="notifications-heading"
        >
          <div className="min-w-0 space-y-1">
            <h1
              id="notifications-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Notificaciones
            </h1>
            {unread > 0 && !typeFilterActive ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {unread === 1 ? '1 sin leer' : `${unread} sin leer`}
              </p>
            ) : null}
          </div>
          <div
            className="flex flex-wrap items-center gap-1.5 sm:gap-2"
            role="group"
            aria-label="Acciones de notificaciones"
          >
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="px-2.5 text-xs sm:px-3 sm:text-sm"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                Marcar todo leído
              </Button>
            )}
            {hasRead ? (
              <Button
                variant="ghost"
                size="sm"
                className="px-2.5 text-xs sm:px-3 sm:text-sm"
                onClick={() => setClearOpen(true)}
                loading={clearRead.isPending}
              >
                Limpiar leídas
              </Button>
            ) : null}
          </div>
        </header>

        <NotificationTypeFiltersBar
          type={type}
          onTypeChange={setType}
          onClear={clearType}
        />

        <PushAlertsPanel variant="compact" />

        {isLoading ? (
          <NotificationListSkeleton count={5} />
        ) : filterEmpty && filterEmptyCopy ? (
          <EmptyState
            icon={Bell}
            title={filterEmptyCopy.title}
            description={filterEmptyCopy.description}
          >
            <Button type="button" variant="secondary" onClick={clearType}>
              Ver todas
            </Button>
          </EmptyState>
        ) : isEmpty ? (
          <EmptyState
            icon={Bell}
            title="Sin notificaciones"
            description="Cuando alguien te siga o le guste tu cápsula, aparecerá aquí."
          >
            <Button asChild>
              <Link to="/feed">Ir al feed</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/search?tab=people">Buscar aficionados</Link>
            </Button>
          </EmptyState>
        ) : (
          <section className="space-y-3" aria-labelledby="notifications-list-heading">
            <h2 id="notifications-list-heading" className="sr-only">
              Lista de notificaciones
            </h2>
            <ul
              className="divide-y divide-border rounded-lg border"
              data-testid="notifications-list"
            >
              {digestGroups.map((group) => (
                <li key={group.key}>
                  <DigestNotificationItem
                    group={group}
                    onOpen={(ids) => markRead.mutate(ids)}
                  />
                </li>
              ))}
            </ul>
            <InfiniteScrollSentinel
              className="pt-1"
              hasNextPage={Boolean(hasNextPage)}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </section>
        )}
      </div>

      <ConfirmDialog
        open={clearOpen}
        title="¿Limpiar notificaciones leídas?"
        description="Se borrarán solo las ya leídas. Las no leídas se mantienen."
        confirmLabel="Limpiar"
        busy={clearRead.isPending}
        onConfirm={() => {
          clearRead.mutate(undefined, {
            onSettled: () => setClearOpen(false),
          });
        }}
        onCancel={() => {
          if (!clearRead.isPending) setClearOpen(false);
        }}
      />
    </Layout>
  );
}
