import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

function greetingForHour(hour: number): string {
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function todayShort(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

type Props = {
  name: string;
  totalMatches: number;
  isLoading?: boolean;
  className?: string;
};

/** Cabecera del home: saludo personal + atmósfera + una acción clara. */
export function HomeHero({ name, totalMatches, isLoading = false, className }: Props) {
  const greeting = greetingForHour(new Date().getHours());
  const firstName = name.trim().split(/\s+/)[0] || name;
  const hasMatches = totalMatches > 0;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/[0.07] p-5 sm:p-6 motion-reveal',
        className,
      )}
      aria-labelledby="home-hero-heading"
      data-testid="home-hero"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-4">
        <p className="text-xs font-medium capitalize tracking-wide text-muted-foreground">
          {todayShort()}
        </p>

        <div className="space-y-1.5">
          <h1
            id="home-hero-heading"
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {greeting},{' '}
            <span className="text-primary">{firstName}</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {isLoading
              ? 'Cargando tu diario…'
              : hasMatches
                ? 'Tu diario de partidos. Hoy, lo que importa.'
                : 'Guarda el primer partido y empieza tu diario futbolero.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
          <Link
            to="/search"
            className={cn(
              buttonVariants({ size: 'default' }),
              'inline-flex min-h-11 items-center gap-2',
            )}
            aria-label={hasMatches ? 'Guardar un partido nuevo' : 'Buscar un partido'}
          >
            {hasMatches ? (
              <>
                <Plus className="h-4 w-4" aria-hidden />
                Guardar partido
              </>
            ) : (
              <>
                <Search className="h-4 w-4" aria-hidden />
                Buscar partido
              </>
            )}
          </Link>

          {hasMatches ? (
            <Link
              to="/capsules"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'default' }),
                'inline-flex min-h-11 items-center gap-1.5 text-muted-foreground',
              )}
              aria-label={`${totalMatches} ${totalMatches === 1 ? 'partido' : 'partidos'} en tu diario`}
            >
              <span className="font-display text-lg font-bold tabular-nums text-foreground">
                {totalMatches}
              </span>
              <span className="text-sm">
                {totalMatches === 1 ? 'partido' : 'partidos'}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
