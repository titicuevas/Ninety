import { MONTH_NAMES_ES } from '@/lib/capsuleStats';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const MONTH_LABELS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

type ChartProps = {
  matchesByMonth: number[];
  peakMonth: { month: number; count: number } | null;
  className?: string;
  /** Estilo embebido (Wrapped público) vs tarjeta (privado). */
  variant?: 'card' | 'embedded';
};

export function MatchesByMonthChart({
  matchesByMonth,
  peakMonth,
  className,
  variant = 'card',
}: ChartProps) {
  if (!matchesByMonth.some((v) => v > 0)) return null;

  const max = Math.max(...matchesByMonth, 1);

  const bars = (
    <div className={cn(variant === 'embedded' ? 'space-y-2' : undefined, className)}>
      {variant === 'embedded' ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100/90">
          Partidos por mes
        </p>
      ) : null}
      <div
        className={cn('flex items-end gap-1', variant === 'embedded' ? 'h-20' : 'h-24')}
        aria-label="Gráfico de partidos por mes"
      >
        {matchesByMonth.map((count, i) => {
          const height = count > 0 ? Math.max((count / max) * 100, 8) : 4;
          const monthKey = `month-${i + 1}`;
          const isPeak = peakMonth?.month === i + 1;
          return (
            <div key={monthKey} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full rounded-sm transition-all',
                  count > 0
                    ? isPeak
                      ? 'bg-primary'
                      : variant === 'embedded'
                        ? 'bg-emerald-300/70'
                        : 'bg-primary/70'
                    : variant === 'embedded'
                      ? 'bg-white/15'
                      : 'bg-secondary',
                )}
                style={{ height: `${height}%` }}
                title={`${MONTH_NAMES_ES[i]}: ${count}`}
              />
              <span
                className={cn(
                  'text-[9px]',
                  isPeak
                    ? 'font-semibold text-primary'
                    : variant === 'embedded'
                      ? 'text-white/55'
                      : 'text-muted-foreground',
                )}
              >
                {MONTH_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (variant === 'embedded') return bars;

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
          Partidos por mes
        </p>
        {bars}
      </CardContent>
    </Card>
  );
}
