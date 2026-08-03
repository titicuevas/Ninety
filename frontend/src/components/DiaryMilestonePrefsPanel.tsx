import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import {
  isDiaryMilestoneEnabled,
  readDiaryMilestonePrefs,
  setDiaryMilestoneEnabled,
} from '@/lib/diaryMilestoneMemory';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Toggle en Ajustes: hitos del diario on-device. */
export function DiaryMilestonePrefsPanel({ className }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [enabled, setEnabled] = useState(true);

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

  return (
    <div className={cn('space-y-3', className)} data-testid="diary-milestone-prefs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Trophy className="h-4 w-4 text-primary" aria-hidden />
            Hitos del diario
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Celebraciones en Inicio al llegar a 5, 10, 25… Capsules. Solo en este dispositivo; sin
            emails.
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
    </div>
  );
}
