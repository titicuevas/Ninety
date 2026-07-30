import { Sparkles } from 'lucide-react';
import { formatRating } from '@/lib/capsuleStats';
import type { PublicProfileStats } from '@/types/publicProfile';

export function PublicWrappedSummary({
  name,
  stats,
}: {
  name: string;
  stats: PublicProfileStats;
}) {
  if (stats.totalMatches <= 0) return null;

  const chips = [
    {
      value: formatRating(stats.averageRating),
      label: 'media ★',
    },
    stats.fiveStarCount > 0
      ? { value: String(stats.fiveStarCount), label: 'con 5★' }
      : null,
    stats.topTeam
      ? { value: stats.topTeam.name, label: 'equipo top', wide: true }
      : null,
    stats.topCompetition
      ? { value: stats.topCompetition.name, label: 'competición', wide: true }
      : null,
    stats.peakMonth
      ? {
          value: stats.peakMonth.label,
          label: `mes pico · ${stats.peakMonth.count}`,
        }
      : null,
    stats.topWatchContext
      ? { value: stats.topWatchContext.name, label: 'dónde lo ve' }
      : null,
  ].filter(Boolean) as Array<{ value: string; label: string; wide?: boolean }>;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-emerald-600/25 via-emerald-900/15 to-background p-5 sm:p-6"
      aria-labelledby="public-wrapped-heading"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative space-y-4">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium text-emerald-100">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Wrapped público
        </p>
        <div>
          <h2 id="public-wrapped-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
            El fútbol de {name}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Resumen de su diario visible · {stats.totalMatches}{' '}
            {stats.totalMatches === 1 ? 'partido' : 'partidos'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {chips.map((chip) => (
            <div
              key={`${chip.label}-${chip.value}`}
              className={`rounded-xl bg-black/25 px-3 py-3 backdrop-blur-sm ${chip.wide ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <p className="truncate text-sm font-semibold sm:text-base">{chip.value}</p>
              <p className="text-[11px] text-white/65">{chip.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
