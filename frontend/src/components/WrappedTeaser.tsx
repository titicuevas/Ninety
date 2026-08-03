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
};

/** Resumen compacto del Wrapped para Home — el detalle vive detrás de “Ver Wrapped”. */
export function WrappedTeaser({ name, stats, scope, href }: WrappedTeaserProps) {
  const periodLabel = scope === 'all' ? 'Todo tu diario' : `Año ${scope}`;
  const topTeam = stats.topTeam?.name;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-emerald-600/30 via-emerald-900/20 to-background p-5 sm:p-6"
      aria-labelledby="wrapped-teaser-heading"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />

      <div className="relative space-y-4">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium text-emerald-100">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Tu Wrapped · {periodLabel}
        </p>

        <div>
          <h2 id="wrapped-teaser-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
            {name}, esto es tu fútbol
            {scope !== 'all' ? ` en ${scope}` : ''}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-white/75">
            Un vistazo rápido — abre el Wrapped completo para highlights, stats y mapa.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 sm:gap-6">
          <div>
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
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

        <Button asChild className="min-h-11">
          <Link to={href}>Ver Wrapped</Link>
        </Button>
      </div>
    </section>
  );
}
