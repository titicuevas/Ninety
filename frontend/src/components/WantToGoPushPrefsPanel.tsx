import { Ticket } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import {
  useNotificationAlertPreferences,
  useUpdateNotificationAlertPreferences,
} from '@/hooks/useNotificationAlertPreferences';
import { deviceTimeZone } from '@/lib/notificationAlertPreferences';
import {
  isWantToGoNudgeEnabled,
  readWantToGoNudgePrefs,
  setWantToGoNudgeEnabled,
} from '@/lib/wantToGoNudgeMemory';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Ajustes: card on-device en Home + push opt-in cuando se acerca un Quiero ir. */
export function WantToGoPushPrefsPanel({ className }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [cardEnabled, setCardEnabled] = useState(true);
  const { data: alertPrefs, isLoading, isError } = useNotificationAlertPreferences();
  const updateAlertPrefs = useUpdateNotificationAlertPreferences();
  const pushEnabled = alertPrefs?.push_want_to_go === true;

  useEffect(() => {
    if (!userId) {
      setCardEnabled(true);
      return;
    }
    setCardEnabled(isWantToGoNudgeEnabled(readWantToGoNudgePrefs(userId)));
  }, [userId]);

  const onToggleCard = useCallback(() => {
    if (!userId) return;
    const next = !cardEnabled;
    setWantToGoNudgeEnabled(userId, next);
    setCardEnabled(next);
  }, [userId, cardEnabled]);

  const onTogglePush = useCallback(() => {
    if (updateAlertPrefs.isPending) return;
    const next = !pushEnabled;
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
  }, [pushEnabled, updateAlertPrefs]);

  return (
    <div className={cn('space-y-3', className)} data-testid="want-to-go-push-prefs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Ticket className="h-4 w-4 text-primary" aria-hidden />
            Recordatorio Quiero ir
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Card en Inicio cuando un partido de tu lista se acerca (próximas ~48 h). En este
            dispositivo.
          </p>
        </div>
        <Button
          type="button"
          variant={cardEnabled ? 'secondary' : 'outline'}
          className="shrink-0"
          aria-pressed={cardEnabled}
          onClick={onToggleCard}
        >
          {cardEnabled ? 'Activados' : 'Desactivados'}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" id="want-to-go-push-hint">
          También como push (opt-in; un aviso por partido; respeta horario silencioso). Abre Quiero
          ir.
        </p>
        <Button
          type="button"
          variant={pushEnabled ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          aria-pressed={pushEnabled}
          aria-describedby="want-to-go-push-hint"
          disabled={isLoading || isError}
          loading={
            updateAlertPrefs.isPending && updateAlertPrefs.variables?.push_want_to_go !== undefined
          }
          onClick={onTogglePush}
        >
          {pushEnabled ? 'Push on' : 'Push off'}
        </Button>
      </div>
    </div>
  );
}
