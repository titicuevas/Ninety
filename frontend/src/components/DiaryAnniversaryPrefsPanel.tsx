import { useCallback, useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import {
  useNotificationAlertPreferences,
  useUpdateNotificationAlertPreferences,
} from '@/hooks/useNotificationAlertPreferences';
import {
  isDiaryAnniversaryEnabled,
  readDiaryAnniversaryPrefs,
  setDiaryAnniversaryEnabled,
} from '@/lib/diaryAnniversaryMemory';
import { deviceTimeZone } from '@/lib/notificationAlertPreferences';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Toggle en Ajustes: aniversarios «Tal día como hoy» on-device + push opt-in. */
export function DiaryAnniversaryPrefsPanel({ className }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [enabled, setEnabled] = useState(true);
  const { data: alertPrefs } = useNotificationAlertPreferences();
  const updateAlertPrefs = useUpdateNotificationAlertPreferences();
  const pushEnabled = alertPrefs?.push_anniversary === true;

  useEffect(() => {
    if (!userId) {
      setEnabled(true);
      return;
    }
    setEnabled(isDiaryAnniversaryEnabled(readDiaryAnniversaryPrefs(userId)));
  }, [userId]);

  const onToggle = useCallback(() => {
    if (!userId) return;
    const next = !enabled;
    setDiaryAnniversaryEnabled(userId, next);
    setEnabled(next);
  }, [userId, enabled]);

  const onTogglePush = useCallback(() => {
    if (updateAlertPrefs.isPending) return;
    const next = !pushEnabled;
    updateAlertPrefs.mutate({
      push_anniversary: next,
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
    <div className={cn('space-y-3', className)} data-testid="diary-anniversary-prefs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <History className="h-4 w-4 text-primary" aria-hidden />
            Aniversarios del diario
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            «Tal día como hoy» en Inicio cuando hace años viste un partido. Card en este dispositivo.
          </p>
        </div>
        <Button
          type="button"
          variant={enabled ? 'secondary' : 'outline'}
          className="shrink-0"
          aria-pressed={enabled}
          onClick={onToggle}
        >
          {enabled ? 'Activados' : 'Desactivados'}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" id="diary-anniversary-push-hint">
          También como push (opt-in; máx. uno por día; respeta horario silencioso). Sin emails.
        </p>
        <Button
          type="button"
          variant={pushEnabled ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          aria-pressed={pushEnabled}
          aria-describedby="diary-anniversary-push-hint"
          loading={
            updateAlertPrefs.isPending &&
            updateAlertPrefs.variables?.push_anniversary !== undefined
          }
          onClick={onTogglePush}
        >
          {pushEnabled ? 'Push on' : 'Push off'}
        </Button>
      </div>
    </div>
  );
}
