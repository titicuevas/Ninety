import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNotifications, useMarkAllRead, type AppNotification } from '@/hooks/useNotifications';
import { useEnablePush, usePushEnabled, usePushPublicKey } from '@/hooks/usePushNotifications';
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

function NotificationItem({ n }: { n: AppNotification }) {
  const Icon = iconMap[n.type];
  const actorName = n.actor?.display_name || (n.actor?.username ? `@${n.actor.username}` : 'Alguien');
  const link = n.type === 'follow' && n.actor?.username
    ? `/u/${n.actor.username}`
    : n.capsule_id
      ? `/c/${n.capsule_id}`
      : undefined;

  const content = (
    <div className={cn(
      'flex items-start gap-3 rounded-lg p-3 transition-colors',
      !n.read && 'bg-primary/5',
      link && 'hover:bg-secondary/60',
    )}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{actorName}</span>{' '}
          {textMap[n.type]}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAll = useMarkAllRead();
  const { data: pushKey, isError: pushUnavailable } = usePushPublicKey();
  const { data: pushEnabled = false } = usePushEnabled();
  const enablePush = useEnablePush();
  const notifications = data?.notifications ?? [];
  const unread = data?.unread_count ?? 0;
  const canEnablePush = !!pushKey?.enabled && !pushUnavailable;

  useEffect(() => {
    if (unread > 0) {
      markAll.mutate();
    }
    // Solo al cargar/cambiar el contador; mutate es estable en TanStack Query
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markAll.mutate
  }, [unread]);

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
              <span className="text-xs text-muted-foreground">Alertas activadas</span>
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
          </div>
        </div>

        {enablePush.isError ? (
          <p className="text-sm text-destructive">
            {enablePush.error instanceof Error ? enablePush.error.message : 'No se pudieron activar las alertas'}
          </p>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center sm:p-10">
              <Bell className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-lg font-medium">Sin notificaciones</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cuando alguien te siga o le guste tu cápsula, aparecerá aquí.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-lg border">
            {notifications.map((n) => (
              <NotificationItem key={n.id} n={n} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
