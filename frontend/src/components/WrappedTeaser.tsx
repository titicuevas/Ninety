import { Link } from 'react-router-dom';
import { Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRating, type CapsuleStats, type WrappedScope } from '@/lib/capsuleStats';

type WrappedTeaserProps = {
  name: string;
  stats: CapsuleStats;
  scope: WrappedScope;
  /** Ruta o query para abrir el Wrapped completo (misma Home expandida). */
  href: string;
  onDismiss?: () => void;
};

/** Resumen compacto del Wrapped para Home — el detalle vive detrás de “Ver Wrapped”. */
export function WrappedTeaser({ name, stats, scope, href, onDismiss }: WrappedTeaserProps) {
  const periodLabel = scope === 'all' ? 'Todo tu diario' : `Año ${scope}`;
  const topTeam = stats.topTeam?.name;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-emerald-600/30 via-emerald-900/20 to-background p-4 sm:p-5"
      aria-labelledby="wrapped-teaser-heading"
      data-testid="wrapped-teaser"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-3 sm:space-y-4">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium text-emerald-100">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Tu Wrapped · {periodLabel}
        </p>

        <h2 id="wrapped-teaser-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
          {name}, esto es tu fútbol
          {scope !== 'all' ? ` en ${scope}` : ''}
        </h2>

        <div className="flex flex-wrap items-end gap-4 sm:gap-6">
          <div>
            <p className="font-display text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
              {stats.totalMatches}
            </p>
            <p className="mt-0.5 text-sm text-emerald-100/90">
              {stats.totalMatches === 1 ? 'partido' : 'partidos'}
            </p>
          </div>
          {stats.averageRating != null ? (
            <div>
              <p className="text-2xl font-semibold tabular-nums">{formatRating(stats.averageRating)}⭐</p>
              <p className="text-xs text-white/70">media</p>
            </div>
          ) : null}
          {topTeam ? (
            <div className="min-w-0 max-w-[12rem]">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                <Trophy className="h-3.5 w-3.5 shrink-0 text-emerald-200" aria-hidden />
                <span className="truncate">{topTeam}</span>
              </p>
              <p className="text-xs text-white/70">equipo más visto</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to={href}>Ver Wrapped</Link>
          </Button>
          {onDismiss ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
              Ahora no
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** CTA compacto cuando el teaser está descartado — no bloquea el resto de Home. */
export function WrappedTeaserCompact({ href, stats }: { href: string; stats: CapsuleStats }) {
  return (
    <p
      className="rounded-xl border border-border/80 bg-card/60 px-4 py-3 text-sm text-muted-foreground"
      data-testid="wrapped-teaser-compact"
    >
      Tu Wrapped ({stats.totalMatches}{' '}
      {stats.totalMatches === 1 ? 'partido' : 'partidos'}) ·{' '}
      <Link to={href} className="font-medium text-primary hover:underline">
        Ver resumen
      </Link>
    </p>
  );
}
