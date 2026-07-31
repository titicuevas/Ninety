import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePushActivationPrompt } from '@/hooks/usePushActivationPrompt';
import { cn } from '@/lib/utils';

type Props = {
  context?: 'home' | 'post_create';
  className?: string;
};

export function PushActivationBanner({ context = 'home', className }: Props) {
  const { visible, activate, dismiss, isActivating, error } = usePushActivationPrompt(context);

  if (!visible) return null;

  return (
    <Card
      className={cn('border-primary/40 bg-primary/5 motion-reveal', className)}
      data-testid="push-activation-banner"
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 font-medium">
            <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
            Activa las alertas
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Entérate al momento cuando alguien te siga, comente o dé me gusta.
          </p>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" loading={isActivating} onClick={activate}>
            Activar alertas
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isActivating}
            onClick={() => dismiss(false)}
          >
            Ahora no
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isActivating}
            className="text-muted-foreground"
            onClick={() => dismiss(true)}
          >
            No volver a mostrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
