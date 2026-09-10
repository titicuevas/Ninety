import { Mail } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  useNotificationAlertPreferences,
  useUpdateNotificationAlertPreferences,
} from '@/hooks/useNotificationAlertPreferences';
import { deviceTimeZone } from '@/lib/notificationAlertPreferences';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Toggle en Ajustes: digest email semanal del diario (opt-in, default off). */
export function EmailDigestPrefsPanel({ className }: Props) {
  const { data: alertPrefs, isLoading, isError } = useNotificationAlertPreferences();
  const updateAlertPrefs = useUpdateNotificationAlertPreferences();
  const enabled = alertPrefs?.email_digest === true;

  const onToggle = useCallback(() => {
    if (updateAlertPrefs.isPending) return;
    const next = !enabled;
    updateAlertPrefs.mutate({
      email_digest: next,
      ...(next
        ? {
            push_quiet: {
              timezone: deviceTimeZone(),
            },
          }
        : {}),
    });
  }, [enabled, updateAlertPrefs]);

  return (
    <div className={cn('space-y-3', className)} data-testid="email-digest-prefs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
            Resumen semanal por email
          </p>
          <p className="mt-1 text-sm text-muted-foreground" id="email-digest-hint">
            Cada lunes, un correo corto con tus partidos de la semana. Por defecto está
            desactivado; puedes darte de baja desde el propio email o aquí.
          </p>
        </div>
        <Button
          type="button"
          variant={enabled ? 'secondary' : 'outline'}
          className="min-h-11 shrink-0"
          aria-pressed={enabled}
          aria-describedby="email-digest-hint"
          disabled={isLoading || isError}
          loading={
            updateAlertPrefs.isPending && updateAlertPrefs.variables?.email_digest !== undefined
          }
          onClick={onToggle}
        >
          {enabled ? 'Activado' : 'Activar'}
        </Button>
      </div>
    </div>
  );
}
