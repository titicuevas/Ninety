import { BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useNotificationAlertPreferences,
  useUpdateNotificationAlertPreferences,
} from '@/hooks/useNotificationAlertPreferences';
import {
  NOTIFICATION_ALERT_TYPE_HINTS,
  NOTIFICATION_ALERT_TYPE_LABELS,
  NOTIFICATION_ALERT_TYPES,
  type NotificationAlertType,
} from '@/lib/notificationAlertPreferences';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Preferencias por tipo: silencia in-app + push (sin emails). */
export function NotificationTypePrefsPanel({ className }: Props) {
  const { data: prefs, isLoading, isError } = useNotificationAlertPreferences();
  const updatePrefs = useUpdateNotificationAlertPreferences();

  const onToggle = (type: NotificationAlertType) => {
    if (!prefs || updatePrefs.isPending) return;
    updatePrefs.mutate({ [type]: !prefs[type] });
  };

  return (
    <section
      className={cn('space-y-3', className)}
      aria-labelledby="notification-type-prefs-heading"
      data-testid="notification-type-prefs"
    >
      <div className="min-w-0">
        <h2
          id="notification-type-prefs-heading"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <BellOff className="h-4 w-4 text-primary" aria-hidden />
          Alertas por tipo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Silencia likes, comentarios o seguidores en el centro de alertas y en push. Sin emails.
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          No se pudieron cargar las preferencias.
        </p>
      ) : null}

      <ul className="space-y-3" aria-label="Preferencias por tipo de alerta">
        {NOTIFICATION_ALERT_TYPES.map((type) => {
          const enabled = prefs?.[type] !== false;
          const busy = updatePrefs.isPending && updatePrefs.variables?.[type] !== undefined;
          return (
            <li
              key={type}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium" id={`alert-type-${type}-label`}>
                  {NOTIFICATION_ALERT_TYPE_LABELS[type]}
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  id={`alert-type-${type}-hint`}
                >
                  {NOTIFICATION_ALERT_TYPE_HINTS[type]}
                </p>
              </div>
              <Button
                type="button"
                variant={enabled ? 'secondary' : 'outline'}
                className="shrink-0"
                aria-pressed={enabled}
                aria-describedby={`alert-type-${type}-hint`}
                aria-label={`${NOTIFICATION_ALERT_TYPE_LABELS[type]}: ${enabled ? 'activadas' : 'silenciadas'}`}
                disabled={isLoading || !prefs}
                loading={busy}
                onClick={() => onToggle(type)}
              >
                {enabled ? 'Activadas' : 'Silenciadas'}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
