import { Link } from 'react-router-dom';
import { Compass, Library, Swords, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  visible: boolean;
  importedCount: number;
  hasCollection: boolean;
  hasCompare: boolean;
  /** Username sugerido para el primer cara a cara. */
  compareTargetUsername?: string | null;
  dismiss: (permanent?: boolean) => void;
  className?: string;
};

export function PostImportGuideCard({
  visible,
  importedCount,
  hasCollection,
  hasCompare,
  compareTargetUsername,
  dismiss,
  className,
}: Props) {
  if (!visible) return null;

  const compareHref = compareTargetUsername
    ? `/u/${encodeURIComponent(compareTargetUsername)}/vs`
    : '/search?tab=people';

  const countLabel =
    importedCount === 1 ? '1 Capsule restaurada' : `${importedCount} Capsules restauradas`;

  const steps = [
    {
      key: 'collections',
      done: hasCollection,
      icon: Library,
      title: 'Crea una colección',
      description: 'El export no incluye listas: agrupa Clásicos, Viajes…',
      href: '/collections?new=1',
    },
    {
      key: 'feed',
      done: false,
      icon: Compass,
      title: 'Mira el feed',
      description: 'Explora la comunidad o sigue aficionados para llenar Siguiendo.',
      href: '/feed?scope=explore',
    },
    {
      key: 'compare',
      done: hasCompare,
      icon: Swords,
      title: 'Compara tu diario',
      description: compareTargetUsername
        ? `Cara a cara con @${compareTargetUsername}.`
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
      data-testid="post-import-guide-card"
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Upload className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">Diario restaurado</h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {countLabel}. Tres gestos para volver a sacarle partido.
            </p>
          </div>
        </div>

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
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', step.done && 'line-through opacity-70')}>
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
