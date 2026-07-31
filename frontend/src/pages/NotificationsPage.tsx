import { Link } from 'react-router-dom';
import { Bell, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  useMarkAllRead,
  useMarkNotificationsRead,
  useClearReadNotifications,
  type AppNotification,
} from '@/hooks/useNotifications';
import {
  useDisablePush,
  useEnablePush,
  usePushEnabled,
  usePushPublicKey,
  usePushSupport,
  useTestPush,
} from '@/hooks/usePushNotifications';
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
        {snippet ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">«{snippet}»</p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );

  if (link) {
    return (
      <Link
        to={link}
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
      onClick={() => {
        if (!n.read) onOpen?.(n.id);
      }}
    >
      {content}
    </button>
  );
}

export function NotificationsPage() {
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
  const { data: pushKey, isError: pushUnavailable } = usePushPublicKey();
  const { data: pushSupport } = usePushSupport();
  const { data: pushEnabled = false } = usePushEnabled();
  const enablePush = useEnablePush();
  const disablePush = useDisablePush();
  const testPush = useTestPush();
  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];
  const unread = data?.pages[0]?.unread_count ?? 0;
  const hasRead = notifications.some((n) => n.read);
  const canEnablePush = !!pushKey?.enabled && !pushUnavailable;
  const showPushDiagnostics = !canEnablePush || pushSupport?.permission === 'denied';
  const pushPermissionLabel =
    pushSupport?.permission === 'granted'
      ? 'Permitidas'
      : pushSupport?.permission === 'denied'
        ? 'Bloqueadas'
        : pushSupport?.permission === 'default'
          ? 'Pendientes'
          : 'No compatible';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notificaciones</h1>
          <div className="flex flex-wrap items-center gap-2">
            {canEnablePush && !pushEnabled ? (
              <Button
                variant="secondary"
                size="sm"
                loading={enablePush.isPending}
                onClick={() => enablePush.mutate()}
              >
                Activar alertas
              </Button>
            ) : null}
            {pushEnabled ? (
              <>
                <span className="text-xs text-muted-foreground">Alertas activadas</span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={testPush.isPending}
                  onClick={() => testPush.mutate()}
                >
                  Enviar prueba
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={disablePush.isPending}
                  onClick={() => disablePush.mutate()}
                >
                  Desactivar alertas
                </Button>
              </>
            ) : null}
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
                onClick={() => clearRead.mutate()}
                loading={clearRead.isPending}
              >
                Limpiar leídas
              </Button>
            ) : null}
          </div>
        </div>

        {enablePush.isError ? (
          <p className="text-sm text-destructive">
            {enablePush.error instanceof Error ? enablePush.error.message : 'No se pudieron activar las alertas'}
          </p>
        ) : null}
        {disablePush.isError ? (
          <p className="text-sm text-destructive">
            {disablePush.error instanceof Error
              ? disablePush.error.message
              : 'No se pudieron desactivar las alertas'}
          </p>
        ) : null}
        {testPush.isError ? (
          <p className="text-sm text-destructive">
            {testPush.error instanceof Error ? testPush.error.message : 'No se pudo enviar la prueba'}
          </p>
        ) : null}
        {testPush.isSuccess ? (
          <p className="text-sm text-primary">Prueba enviada. Revisa las notificaciones del sistema.</p>
        ) : null}
        {clearRead.isError ? (
          <p className="text-sm text-destructive">
            {clearRead.error instanceof Error ? clearRead.error.message : 'No se pudieron limpiar'}
          </p>
        ) : null}

        {showPushDiagnostics ? (
          <p className="text-xs text-muted-foreground" data-testid="push-diagnostics">
            Alertas push:{' '}
            {canEnablePush ? 'servidor listo' : 'pendiente en backend/Railway'}
            {' · '}
            {pushSupport?.supported ? 'navegador compatible' : 'navegador no compatible'}
            {' · '}
            permiso {pushPermissionLabel.toLowerCase()}
          </p>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
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
            <div className="divide-y divide-border rounded-lg border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onOpen={(id) => markRead.mutate([id])}
                />
              ))}
            </div>
            {hasNextPage ? (
              <div className="flex justify-center pt-1">
                <Button
                  variant="secondary"
                  loading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  Cargar más
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Layout>
  );
}
