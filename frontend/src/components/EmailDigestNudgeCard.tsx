import { Link } from 'react-router-dom';
import { Mail, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useNotificationAlertPreferences,
  useUpdateNotificationAlertPreferences,
} from '@/hooks/useNotificationAlertPreferences';
import { deviceTimeZone } from '@/lib/notificationAlertPreferences';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ninety.emailDigestNudge.v1';

function readDismissed(userId?: string): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}.${userId}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { dismissedAt?: number };
    if (!parsed.dismissedAt) return false;
    // No volver a mostrar hasta 30 días
    return Date.now() - parsed.dismissedAt < 30 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function writeDismissed(userId: string) {
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY}.${userId}`,
      JSON.stringify({ dismissedAt: Date.now() }),
    );
  } catch {
    /* ignore quota */
  }
}

type Props = {
  userId?: string;
  totalMatches: number;
  coreComplete: boolean;
  className?: string;
};

/** Soft CTA en Home para activar el digest email (opt-in). */
export function EmailDigestNudgeCard({
  userId,
  totalMatches,
  coreComplete,
  className,
}: Props) {
  const { data: alertPrefs, isLoading } = useNotificationAlertPreferences();
  const updateAlertPrefs = useUpdateNotificationAlertPreferences();
  const [dismissed, setDismissed] = useState(() => readDismissed(userId));

  const enabled = alertPrefs?.email_digest === true;
  const visible =
    coreComplete &&
    !isLoading &&
    !enabled &&
    !dismissed &&
    totalMatches >= 3 &&
    Boolean(userId);

  const dismiss = useCallback(() => {
    if (userId) writeDismissed(userId);
    setDismissed(true);
  }, [userId]);

  const activate = useCallback(() => {
    updateAlertPrefs.mutate(
      {
        email_digest: true,
        push_quiet: { timezone: deviceTimeZone() },
      },
      {
        onSuccess: () => {
          if (userId) writeDismissed(userId);
          setDismissed(true);
        },
      },
    );
  }, [updateAlertPrefs, userId]);

  if (!visible) return null;

  return (
    <aside
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between motion-reveal',
        className,
      )}
      aria-labelledby="email-digest-nudge-title"
      data-testid="email-digest-nudge"
    >
      <div className="min-w-0 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Mail className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p id="email-digest-nudge-title" className="text-sm font-semibold text-foreground">
            Resumen semanal por email
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cada lunes, un correo con tus partidos de la semana. Puedes desactivarlo cuando quieras
            en{' '}
            <Link to="/settings" className="text-primary underline-offset-2 hover:underline">
              Ajustes
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          loading={updateAlertPrefs.isPending}
          onClick={activate}
        >
          Activar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Cerrar aviso de resumen semanal"
          onClick={dismiss}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </aside>
  );
}
