import { Link } from 'react-router-dom';
import { BarChart3, Heart, Repeat2, Swords } from 'lucide-react';
import type { AdvancedStats } from '@/lib/advancedStats';
import { formatSharePct } from '@/lib/advancedStats';
import { cn } from '@/lib/utils';

type AdvancedStatsSectionProps = {
  stats: AdvancedStats;
  className?: string;
};

function RatingBars({ distribution }: { distribution: AdvancedStats['ratingDistribution'] }) {
  const max = Math.max(...distribution.map((b) => b.count), 1);
  const hasAny = distribution.some((b) => b.count > 0);
  if (!hasAny) return null;

  return (
    <div className="space-y-2" aria-label="Distribución de valoraciones">
      {[...distribution].reverse().map((bucket) => (
        <div key={bucket.stars} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {bucket.stars}★
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary/80 transition-[width]"
              style={{ width: `${Math.max((bucket.count / max) * 100, bucket.count > 0 ? 6 : 0)}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Profundiza el Wrapped: valoraciones, contextos, rivalidades y balance del favorito.
 */
export function AdvancedStatsSection({ stats, className }: AdvancedStatsSectionProps) {
  const hasRatings = stats.ratingDistribution.some((b) => b.count > 0);
  const hasContexts = stats.watchContextMix.length > 0;
  const hasRivalries = stats.topRivalries.length > 0;
  const record = stats.favoriteTeamRecord;

  if (!hasRatings && !hasContexts && !hasRivalries && !record) return null;

  const headingId = 'advanced-stats-heading';

  return (
    <section className={cn('space-y-5 motion-reveal', className)} aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
        Estadísticas avanzadas
      </h2>

      <div className="grid gap-6 sm:grid-cols-2">
        {hasRatings ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Valoraciones</p>
            <RatingBars distribution={stats.ratingDistribution} />
            <p className="text-xs text-muted-foreground">
              Valoras el {formatSharePct(stats.ratedShare)} de tus partidos
              {stats.noteShare > 0 ? ` · notas en el ${formatSharePct(stats.noteShare)}` : ''}
            </p>
          </div>
        ) : null}

        {hasContexts ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Dónde lo ves</p>
            <ul className="space-y-2">
              {stats.watchContextMix.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.count} · {row.pct}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {stats.uniqueTeams} equipos · {stats.uniqueCompetitions} competiciones
              {stats.avgDaysBetween != null
                ? ` · cada ~${stats.avgDaysBetween} días`
                : ''}
            </p>
          </div>
        ) : null}
      </div>

      {record ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            Tu {record.team}
          </div>
          <p className="mt-2 text-sm">
            Visto en <span className="font-semibold tabular-nums">{record.watched}</span>{' '}
            {record.watched === 1 ? 'partido' : 'partidos'}
            {record.decided > 0 ? (
              <>
                {' '}
                · balance{' '}
                <span className="font-semibold tabular-nums">
                  {record.wins}V · {record.draws}E · {record.losses}D
                </span>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {hasRivalries ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Swords className="h-3.5 w-3.5" aria-hidden="true" />
            Rivalidades repetidas
          </p>
          <ul className="space-y-2">
            {stats.topRivalries.map((r) => (
              <li
                key={r.pairKey}
                className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.teamA} vs {r.teamB}
                  </p>
                  {r.averageRating != null ? (
                    <p className="text-xs text-muted-foreground">
                      Media {r.averageRating.toFixed(1)}★
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {r.count}×
                </span>
              </li>
            ))}
          </ul>
          <ButtonLinkSearch />
        </div>
      ) : null}
    </section>
  );
}

function ButtonLinkSearch() {
  return (
    <p className="text-xs text-muted-foreground">
      ¿Otro clásico?{' '}
      <Link to="/search" className="text-primary hover:underline">
        Busca el próximo partido
      </Link>
    </p>
  );
}
