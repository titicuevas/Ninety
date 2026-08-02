import { Link } from 'react-router-dom';
import { Check, Library, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  hasCollection: boolean;
  /** Username sugerido para el primer cara a cara (siguiendo / discover). */
  compareTargetUsername?: string | null;
  visible: boolean;
  hasCompare: boolean;
  dismiss: (permanent?: boolean) => void;
  className?: string;
};

export function ValueOnboardingCard({
  hasCollection,
  compareTargetUsername,
  visible,
  hasCompare,
  dismiss,
  className,
}: Props) {
  if (!visible) return null;

  const compareHref = compareTargetUsername
    ? `/u/${encodeURIComponent(compareTargetUsername)}/vs`
    : '/search?tab=people';

  const steps = [
    {
      key: 'collection',
      done: hasCollection,
      icon: Library,
      title: 'Crea tu primera colección',
      description: 'Agrupa partidos en listas como Clásicos o Viajes.',
      href: '/collections?new=1',
    },
    {
      key: 'compare',
      done: hasCompare,
      icon: Swords,
      title: 'Prueba un cara a cara',
      description: compareTargetUsername
        ? `Compara tu diario con @${compareTargetUsername}.`
        : 'Elige a otro aficionado y compara diarios.',
      href: compareHref,
    },
  ] as const;

  return (
    <Card
      className={cn(
        'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent motion-reveal',
        className,
      )}
      data-testid="value-onboarding-card"
    >
      <CardContent className="p-5 sm:p-6">
        <h2 className="text-base font-semibold sm:text-lg">Saca más partido</h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Dos gestos que convierten el diario en algo compartible.
        </p>

        <ol className="mt-4 space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const body = (
              <>
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    step.done
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {step.done ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', step.done && 'line-through')}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </>
            );

            return (
              <li key={step.key}>
                {step.done ? (
                  <div className="flex items-start gap-3 rounded-lg p-3 opacity-60">{body}</div>
                ) : (
                  <Link
                    to={step.href}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/60"
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
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
      </CardContent>
    </Card>
  );
}
