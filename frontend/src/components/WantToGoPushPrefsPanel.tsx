import { Ticket } from 'lucide-react';
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

/** Toggle en Ajustes: push cuando se acerca un partido de Quiero ir (opt-in). */
export function WantToGoPushPrefsPanel({ className }: Props) {
  const { data: alertPrefs, isLoading, isError } = useNotificationAlertPreferences();
  const updateAlertPrefs = useUpdateNotificationAlertPreferences();
  const enabled = alertPrefs?.push_want_to_go === true;

  const onToggle = useCallback(() => {
    if (updateAlertPrefs.isPending) return;
    const next = !enabled;
    updateAlertPrefs.mutate({
      push_want_to_go: next,
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
    <div className={cn('space-y-3', className)} data-testid="want-to-go-push-prefs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Ticket className="h-4 w-4 text-primary" aria-hidden />
            Recordatorio Quiero ir
          </p>
          <p className="mt-1 text-sm text-muted-foreground" id="want-to-go-push-hint">
            Push cuando un partido de tu lista se acerca (próximas ~48 h). Opt-in; un aviso por
            partido; respeta horario silencioso. Abre Quiero ir.
          </p>
        </div>
        <Button
          type="button"
          variant={enabled ? 'secondary' : 'outline'}
          className="shrink-0"
          aria-pressed={enabled}
          aria-describedby="want-to-go-push-hint"
          disabled={isLoading || isError}
          loading={
            updateAlertPrefs.isPending && updateAlertPrefs.variables?.push_want_to_go !== undefined
          }
          onClick={onToggle}
        >
          {enabled ? 'Push on' : 'Push off'}
        </Button>
      </div>
    </div>
  );
}
