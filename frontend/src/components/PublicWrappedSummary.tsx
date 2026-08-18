import { Landmark, Sparkles, Star } from 'lucide-react';
import { MatchesByMonthChart } from '@/components/MatchesByMonthChart';
import { StarRating } from '@/components/StarRating';
import { WrappedPhotoCollage } from '@/components/WrappedPhotoCollage';
import { formatRating, type WrappedScope } from '@/lib/capsuleStats';
import { publicWrappedPeriodLabel } from '@/lib/publicWrapped';
import { cn } from '@/lib/utils';
import type { PublicProfileStats } from '@/types/publicProfile';

const EMPTY_YEARS: number[] = [];

export function PublicWrappedSummary({
  name,
  stats,
  scope = 'all',
  years = EMPTY_YEARS,
  onScopeChange,
}: {
  name: string;
  stats: PublicProfileStats;
  scope?: WrappedScope;
  years?: number[];
  onScopeChange?: (scope: WrappedScope) => void;
}) {
  if (stats.totalMatches <= 0) return null;

  const stadiumVisits = stats.stadiumVisits ?? 0;
  const photosCount = stats.photosCount ?? 0;
  const photoCollageUrls = stats.photoCollageUrls ?? [];
  const matchesByMonth = stats.matchesByMonth ?? Array.from({ length: 12 }, () => 0);
  const showYearChips = years.length > 0 && onScopeChange != null;

  const chips = [
    {
      value: formatRating(stats.averageRating),
      label: 'media ★',
    },
    stats.fiveStarCount > 0
      ? { value: String(stats.fiveStarCount), label: 'con 5★' }
      : null,
    stadiumVisits > 0
      ? {
          value: String(stadiumVisits),
          label: 'en estadio',
        }
      : null,
    photosCount > 0
      ? {
          value: String(photosCount),
          label: photosCount === 1 ? 'foto' : 'fotos',
        }
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
      <div className="relative space-y-5">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium text-emerald-100">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Wrapped público
        </p>
        <div>
          <h2 id="public-wrapped-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
            El fútbol de {name}
          </h2>
          <p className="mt-1 text-sm text-white/70">
            {publicWrappedPeriodLabel(scope, stats.totalMatches)}
          </p>
        </div>

        {showYearChips ? (
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Periodo del Wrapped"
            data-testid="public-wrapped-scope"
          >
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'all'}
              onClick={() => onScopeChange?.('all')}
              className={cn(
                'min-h-9 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                scope === 'all'
                  ? 'bg-white text-emerald-950'
                  : 'bg-black/30 text-white/80 hover:text-white',
              )}
            >
              Todo
            </button>
            {years.map((year) => (
              <button
                key={year}
                type="button"
                role="tab"
                aria-selected={scope === year}
                onClick={() => onScopeChange?.(year)}
                className={cn(
                  'min-h-9 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                  scope === year
                    ? 'bg-white text-emerald-950'
                    : 'bg-black/30 text-white/80 hover:text-white',
                )}
              >
                {year}
              </button>
            ))}
          </div>
        ) : null}

        {photoCollageUrls.length > 0 ? (
          <WrappedPhotoCollage urls={photoCollageUrls} label={`Fotos del diario de ${name}`} />
        ) : null}

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

        {stats.bestRated ? (
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/90">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              Mejor valorado
            </div>
            <p className="mt-1.5 font-semibold">
              {stats.bestRated.home_team_name} vs {stats.bestRated.away_team_name}
            </p>
            <div className="mt-2">
              <StarRating rating={stats.bestRated.rating} size="sm" />
            </div>
          </div>
        ) : null}

        {stadiumVisits > 0 ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-emerald-100/90">
            <Landmark className="h-4 w-4" aria-hidden="true" />
            {stadiumVisits} {stadiumVisits === 1 ? 'partido en estadio' : 'partidos en estadio'}
          </p>
        ) : null}

        <MatchesByMonthChart
          matchesByMonth={matchesByMonth}
          peakMonth={
            stats.peakMonth
              ? { month: stats.peakMonth.month, count: stats.peakMonth.count }
              : null
          }
          variant="embedded"
        />
      </div>
    </section>
  );
}
