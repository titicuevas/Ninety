import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import {
  useNotificationAlertPreferences,
  useUpdateNotificationAlertPreferences,
} from '@/hooks/useNotificationAlertPreferences';
import {
  isDiaryMilestoneEnabled,
  readDiaryMilestonePrefs,
  setDiaryMilestoneEnabled,
} from '@/lib/diaryMilestoneMemory';
import { deviceTimeZone } from '@/lib/notificationAlertPreferences';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Toggle en Ajustes: hitos del diario on-device + push opt-in. */
export function DiaryMilestonePrefsPanel({ className }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [enabled, setEnabled] = useState(true);
  const { data: alertPrefs } = useNotificationAlertPreferences();
  const updateAlertPrefs = useUpdateNotificationAlertPreferences();
  const pushEnabled = alertPrefs?.push_milestone === true;

  useEffect(() => {
    if (!userId) {
      setEnabled(true);
      return;
    }
    setEnabled(isDiaryMilestoneEnabled(readDiaryMilestonePrefs(userId)));
  }, [userId]);

  const onToggle = useCallback(() => {
    if (!userId) return;
    const next = !enabled;
    setDiaryMilestoneEnabled(userId, next);
    setEnabled(next);
  }, [userId, enabled]);

  const onTogglePush = useCallback(() => {
    if (updateAlertPrefs.isPending) return;
    const next = !pushEnabled;
    updateAlertPrefs.mutate({
      push_milestone: next,
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
    <div className={cn('space-y-3', className)} data-testid="diary-milestone-prefs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Trophy className="h-4 w-4 text-primary" aria-hidden />
            Hitos del diario
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Celebraciones en Inicio al llegar a 5, 10, 25… Capsules. Card en este dispositivo.
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
        <p className="text-xs text-muted-foreground" id="diary-milestone-push-hint">
          También como push (opt-in; un push por umbral; respeta horario silencioso). Sin emails.
        </p>
        <Button
          type="button"
          variant={pushEnabled ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          aria-pressed={pushEnabled}
          aria-describedby="diary-milestone-push-hint"
          loading={
            updateAlertPrefs.isPending && updateAlertPrefs.variables?.push_milestone !== undefined
          }
          onClick={onTogglePush}
        >
          {pushEnabled ? 'Push on' : 'Push off'}
        </Button>
      </div>
    </div>
  );
}
