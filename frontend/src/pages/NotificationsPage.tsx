import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Bell, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { Layout } from '@/components/Layout';
import { NotificationListSkeleton } from '@/components/ListSkeletons';
import { PushAlertsPanel } from '@/components/PushAlertsPanel';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useNotifications,
  useMarkAllRead,
  useMarkNotificationsRead,
  useClearReadNotifications,
  type AppNotification,
} from '@/hooks/useNotifications';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  formatNotificationAriaLabel,
  formatNotificationMatchContext,
} from '@/lib/notificationCapsule';
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
  follow: UserPlus,
  comment: MessageCircle,
} as const;

const textMap = {
  like: 'le gustó tu cápsula',
  follow: 'te empezó a seguir',
  comment: 'comentó en tu cápsula',
} as const;

function ActorAvatar({ n }: { n: AppNotification }) {
  const Icon = iconMap[n.type];
  const name = n.actor?.display_name || n.actor?.username || '?';
  const avatarUrl = n.actor?.avatar_url;

  return (
    <span className="relative mt-0.5 shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-10 w-10 rounded-full border border-border object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span
        className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-secondary text-muted-foreground"
        aria-hidden
      >
        <Icon className="h-2.5 w-2.5" />
      </span>
    </span>
  );
}

function CapsuleThumb({ n }: { n: AppNotification }) {
  const thumb = n.capsule?.thumb_url;
  if (!thumb || !n.capsule) return null;
  const alt = formatNotificationMatchContext(n.capsule);

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

function NotificationItem({
  n,
  onOpen,
}: {
  n: AppNotification;
  onOpen?: (id: string) => void;
}) {
  const actorName = n.actor?.display_name || (n.actor?.username ? `@${n.actor.username}` : 'Alguien');
  const link =
    n.type === 'follow' && n.actor?.username
      ? `/u/${n.actor.username}`
      : n.capsule_id
        ? n.type === 'comment'
          ? `/c/${n.capsule_id}#comments`
          : `/c/${n.capsule_id}`
        : undefined;
  const snippet = n.type === 'comment' && n.body?.trim() ? n.body.trim() : null;
  const matchLine = n.capsule ? formatNotificationMatchContext(n.capsule) : null;
  const ariaLabel = formatNotificationAriaLabel({
    actorName,
    actionText: textMap[n.type],
    capsule: n.capsule,
    snippet,
  });

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg p-3 transition-colors',
        !n.read && 'bg-primary/5',
        link && 'hover:bg-secondary/60',
      )}
    >
      <ActorAvatar n={n} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{actorName}</span> {textMap[n.type]}
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
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
      </div>
      <CapsuleThumb n={n} />
      {!n.read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      )}
    </div>
  );

  if (link) {
    return (
      <Link
        to={link}
        aria-label={ariaLabel}
        onClick={() => {
          if (!n.read) onOpen?.(n.id);
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="block w-full text-left"
      aria-label={ariaLabel}
      onClick={() => {
        if (!n.read) onOpen?.(n.id);
      }}
    >
      {content}
    </button>
  );
}

export function NotificationsPage() {
  useDocumentTitle('Notificaciones');
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications();
  const markAll = useMarkAllRead();
  const markRead = useMarkNotificationsRead();
  const clearRead = useClearReadNotifications();
  const [clearOpen, setClearOpen] = useState(false);
  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];
  const unread = data?.pages[0]?.unread_count ?? 0;
  const hasRead = notifications.some((n) => n.read);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notificaciones</h1>
          <div className="flex flex-wrap items-center gap-2">
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
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
                onClick={() => setClearOpen(true)}
                loading={clearRead.isPending}
              >
                Limpiar leídas
              </Button>
            ) : null}
          </div>
        </div>

        <PushAlertsPanel variant="compact" />

        {isLoading ? (
          <NotificationListSkeleton count={5} />
        ) : notifications.length === 0 ? (
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
          <div className="space-y-3">
            <div className="divide-y divide-border rounded-lg border" data-testid="notifications-list">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onOpen={(id) => markRead.mutate([id])}
                />
              ))}
            </div>
            <InfiniteScrollSentinel
              className="pt-1"
              hasNextPage={Boolean(hasNextPage)}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </div>
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
