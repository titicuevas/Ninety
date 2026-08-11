import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useDisablePush,
  useEnablePush,
  usePushEnabled,
  usePushPublicKey,
  usePushSupport,
  useTestPush,
} from '@/hooks/usePushNotifications';
import {
  pushPermissionLabel,
  resolvePushAlertsMode,
  shouldShowPushDiagnostics,
} from '@/lib/pushAlertsStatus';
import { cn } from '@/lib/utils';

type Props = {
  /** `card` = bloque completo (Ajustes); `compact` = barra bajo el título (Notificaciones). */
  variant?: 'card' | 'compact';
  className?: string;
};

export function PushAlertsPanel({ variant = 'card', className }: Props) {
  const { data: pushKey, isError: pushUnavailable, isLoading: keyLoading } = usePushPublicKey();
  const { data: pushSupport } = usePushSupport();
  const { data: pushEnabled = false } = usePushEnabled();
  const enablePush = useEnablePush();
  const disablePush = useDisablePush();
  const testPush = useTestPush();

  const canEnablePush = !!pushKey?.enabled && !pushUnavailable;
  const permission = pushSupport?.permission;
  const mode = resolvePushAlertsMode({
    canEnablePush,
    pushEnabled,
    supported: pushSupport?.supported,
    permission,
  });
  const showDiagnostics = shouldShowPushDiagnostics({ canEnablePush, permission });
  const permissionCopy = pushPermissionLabel(permission);

  const statusLine =
    mode === 'ready_on'
      ? 'Alertas activadas en este dispositivo'
      : mode === 'ready_off'
        ? 'Recibe avisos cuando te sigan, comenten o den me gusta'
        : mode === 'permission_denied'
          ? 'El permiso está bloqueado en el navegador'
          : mode === 'unsupported'
            ? 'Este navegador no soporta alertas push'
            : 'Las alertas push aún no están disponibles en el servidor';

  return (
    <section
      className={cn(
        variant === 'card'
          ? 'space-y-3'
          : 'space-y-2 rounded-xl border border-border bg-secondary/30 px-3 py-3',
        className,
      )}
      aria-labelledby="push-alerts-heading"
      data-testid="push-alerts-panel"
    >
      <div
        className={cn(
          'flex flex-col gap-3',
          variant === 'compact' ? 'sm:flex-row sm:items-center sm:justify-between' : undefined,
        )}
      >
        <div className="min-w-0">
          <h2
            id="push-alerts-heading"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <Bell className="h-4 w-4 text-primary" aria-hidden />
            Alertas push
          </h2>
          <p className="mt-1 text-sm text-muted-foreground" id="push-alerts-status">
            {statusLine}
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Controles de alertas push"
          aria-describedby="push-alerts-status"
        >
          {mode === 'ready_off' ? (
            <Button
              type="button"
              variant={variant === 'card' ? 'default' : 'secondary'}
              size="sm"
              loading={enablePush.isPending || keyLoading}
              onClick={() => enablePush.mutate()}
            >
              Activar alertas
            </Button>
          ) : null}
          {mode === 'ready_on' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={testPush.isPending}
                onClick={() => testPush.mutate()}
              >
                Enviar prueba
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={disablePush.isPending}
                onClick={() => disablePush.mutate()}
              >
                Desactivar alertas
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {showDiagnostics ? (
        <div
          className="space-y-1 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground"
          data-testid="push-diagnostics"
        >
          <p>
            Alertas push:{' '}
            {canEnablePush ? 'servidor listo' : 'pendiente en backend/Railway'}
            {' · '}
            {pushSupport?.supported ? 'navegador compatible' : 'navegador no compatible'}
            {' · '}
            permiso {permissionCopy.toLowerCase()}
          </p>
          {!canEnablePush ? (
            <p>
              En producción: configura <code className="text-foreground">VAPID_PUBLIC_KEY</code>,{' '}
              <code className="text-foreground">VAPID_PRIVATE_KEY</code> y{' '}
              <code className="text-foreground">VAPID_SUBJECT</code> en Railway (
              <code className="text-foreground">npm run vapid:set-railway</code>) y aplica la
              migración de <code className="text-foreground">push_subscriptions</code>.
            </p>
          ) : null}
          {permission === 'denied' ? (
            <p>Activa el permiso en la configuración del sitio de tu navegador y vuelve a intentar.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
