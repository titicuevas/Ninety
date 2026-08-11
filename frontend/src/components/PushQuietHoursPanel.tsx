import { Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  useNotificationAlertPreferences,
  useUpdateNotificationAlertPreferences,
} from '@/hooks/useNotificationAlertPreferences';
import {
  deviceTimeZone,
  isValidQuietHhMm,
} from '@/lib/notificationAlertPreferences';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Franja local sin push (las alertas in-app siguen). Sin emails ni toasts de spam. */
export function PushQuietHoursPanel({ className }: Props) {
  const { data: prefs, isLoading, isError } = useNotificationAlertPreferences();
  const updatePrefs = useUpdateNotificationAlertPreferences();
  const quiet = prefs?.push_quiet;
  const enabled = quiet?.enabled === true;
  const busyQuiet =
    updatePrefs.isPending && updatePrefs.variables?.push_quiet !== undefined;

  const onToggle = () => {
    if (!quiet || updatePrefs.isPending) return;
    const nextEnabled = !quiet.enabled;
    updatePrefs.mutate({
      push_quiet: {
        enabled: nextEnabled,
        timezone: deviceTimeZone(),
        start: quiet.start,
        end: quiet.end,
      },
    });
  };

  const onTimeBlur = (field: 'start' | 'end', value: string) => {
    if (!quiet || updatePrefs.isPending) return;
    const trimmed = value.trim();
    if (!isValidQuietHhMm(trimmed) || trimmed === quiet[field]) return;
    updatePrefs.mutate({
      push_quiet: {
        [field]: trimmed,
        timezone: deviceTimeZone(),
      },
    });
  };

  return (
    <section
      className={cn('space-y-3', className)}
      aria-labelledby="push-quiet-hours-heading"
      data-testid="push-quiet-hours-panel"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="push-quiet-hours-heading"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <Moon className="h-4 w-4 text-primary" aria-hidden />
            Horario silencioso de push
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sin push en esta franja (hora de este dispositivo). Las alertas in-app siguen
            llegando. Sin emails.
          </p>
        </div>
        <Button
          type="button"
          variant={enabled ? 'secondary' : 'outline'}
          className="shrink-0"
          aria-pressed={enabled}
          aria-label={`Horario silencioso: ${enabled ? 'activado' : 'desactivado'}`}
          disabled={isLoading || !quiet}
          loading={busyQuiet && updatePrefs.variables?.push_quiet?.enabled !== undefined}
          onClick={onToggle}
        >
          {enabled ? 'Activado' : 'Desactivado'}
        </Button>
      </div>

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          No se pudieron cargar las preferencias.
        </p>
      ) : null}

      {quiet ? (
        <div
          className={cn(
            'grid gap-3 sm:grid-cols-2',
            !enabled && 'opacity-60',
          )}
        >
          <FormField label="Desde" hint="Inicio inclusive (HH:MM)">
            <Input
              type="time"
              defaultValue={quiet.start}
              key={`start-${quiet.start}`}
              disabled={!enabled || isLoading || updatePrefs.isPending}
              aria-label="Inicio del horario silencioso"
              onBlur={(e) => onTimeBlur('start', e.target.value)}
            />
          </FormField>
          <FormField label="Hasta" hint="Fin exclusivo (HH:MM)">
            <Input
              type="time"
              defaultValue={quiet.end}
              key={`end-${quiet.end}`}
              disabled={!enabled || isLoading || updatePrefs.isPending}
              aria-label="Fin del horario silencioso"
              onBlur={(e) => onTimeBlur('end', e.target.value)}
            />
          </FormField>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Zona: {quiet.timezone || deviceTimeZone()}. Se actualiza al guardar desde este
            dispositivo.
          </p>
        </div>
      ) : null}
    </section>
  );
}
