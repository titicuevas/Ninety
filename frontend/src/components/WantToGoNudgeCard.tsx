import { Link, useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WantToGoNudge } from '@/lib/wantToGoNudge';

type Props = {
  nudge: WantToGoNudge | null;
  visible: boolean;
  dismiss: (permanent?: boolean) => void;
  openPrimary: () => void;
  className?: string;
};

export function WantToGoNudgeCard({
  nudge,
  visible,
  dismiss,
  openPrimary,
  className,
}: Props) {
  const navigate = useNavigate();

  if (!visible || !nudge) return null;

  const onPrimary = () => {
    openPrimary();
    if (nudge.kind === 'played' && nudge.createMatch) {
      navigate('/capsules/new', { state: { match: nudge.createMatch } });
    }
  };

  return (
    <Card
      className={cn('border-border/80 bg-secondary/30 motion-reveal', className)}
      data-testid="want-to-go-nudge-card"
      data-nudge-kind={nudge.kind}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Ticket className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">{nudge.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{nudge.body}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-stretch">
          {nudge.kind === 'played' ? (
            <Button type="button" className="w-full sm:w-auto" onClick={onPrimary}>
              {nudge.hrefLabel}
            </Button>
          ) : (
            <Button asChild className="w-full sm:w-auto">
              <Link to={nudge.href} onClick={openPrimary}>
                {nudge.hrefLabel}
              </Link>
            </Button>
          )}
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => dismiss(false)}>
              Ahora no
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => dismiss(true)}
            >
              No volver a mostrar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
