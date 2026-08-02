import { useCallback, useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import {
  isDiaryDigestEnabled,
  readDiaryDigestPrefs,
  setDiaryDigestEnabled,
} from '@/lib/diaryDigestMemory';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Toggle en Ajustes: recordatorios / digest on-device del diario. */
export function DiaryDigestPrefsPanel({ className }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEnabled(true);
      return;
    }
    setEnabled(isDiaryDigestEnabled(readDiaryDigestPrefs(userId)));
  }, [userId]);

  const onToggle = useCallback(() => {
    if (!userId) return;
    const next = !enabled;
    setDiaryDigestEnabled(userId, next);
    setEnabled(next);
  }, [userId, enabled]);

  return (
    <div
      className={cn('space-y-3', className)}
      data-testid="diary-digest-prefs"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
            Recordatorios del diario
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen semanal y avisos suaves en Inicio si llevas días sin guardar partidos. Solo en
            este dispositivo; sin emails.
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
