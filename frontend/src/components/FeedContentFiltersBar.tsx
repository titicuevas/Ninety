import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { Button } from '@/components/ui/button';
import { FEED_COMPETITION_CHIPS } from '@/lib/feedParams';
import { cn } from '@/lib/utils';

type FeedContentFiltersBarProps = {
  photosOnly: boolean;
  competition: string;
  hasFilters: boolean;
  onPhotosOnlyChange: (next: boolean) => void;
  onCompetitionChange: (next: string) => void;
  onClear: () => void;
};

function activeSummaries(photosOnly: boolean, competition: string): string[] {
  const labels: string[] = [];
  if (photosOnly) labels.push('Fotos');
  if (competition) {
    const chip = FEED_COMPETITION_CHIPS.find(
      (c) => c.value.toLowerCase() === competition.toLowerCase(),
    );
    labels.push(chip?.label ?? competition);
  }
  return labels;
}

/** Filtros de contenido del feed: colapsables para no empujar el listado. */
export function FeedContentFiltersBar({
  photosOnly,
  competition,
  hasFilters,
  onPhotosOnlyChange,
  onCompetitionChange,
  onClear,
}: FeedContentFiltersBarProps) {
  const [open, setOpen] = useState(hasFilters);
  const summaries = activeSummaries(photosOnly, competition);
  const chipsVisible = open;

  return (
    <section className="space-y-3" aria-label="Filtros del feed">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          aria-expanded={chipsVisible}
          aria-controls="feed-content-filter-chips"
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filtros
          {summaries.length > 0 ? (
            <span className="rounded-full bg-primary/20 px-1.5 text-[11px] font-semibold text-primary">
              {summaries.length}
            </span>
          ) : null}
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', chipsVisible && 'rotate-180')}
            aria-hidden
          />
        </Button>

        {!chipsVisible && summaries.length > 0 ? (
          <>
            {summaries.map((label) => (
              <span
                key={label}
                className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {label}
              </span>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Limpiar
            </Button>
          </>
        ) : null}
      </div>

      {chipsVisible ? (
        <div id="feed-content-filter-chips" className="space-y-3">
          <div className={filterChipRowClass} role="group" aria-label="Filtrar por fotos">
            <FilterChip active={!photosOnly} onClick={() => onPhotosOnlyChange(false)}>
              Todas
            </FilterChip>
            <FilterChip active={photosOnly} onClick={() => onPhotosOnlyChange(!photosOnly)}>
              Solo con fotos
            </FilterChip>
          </div>

          <div className={filterChipRowClass} role="group" aria-label="Filtrar por competición">
            <FilterChip active={!competition} onClick={() => onCompetitionChange('')}>
              Todas las competiciones
            </FilterChip>
            {FEED_COMPETITION_CHIPS.map((chip) => {
              const active = competition.toLowerCase() === chip.value.toLowerCase();
              return (
                <FilterChip
                  key={chip.value}
                  active={active}
                  onClick={() => onCompetitionChange(active ? '' : chip.value)}
                >
                  {chip.label}
                </FilterChip>
              );
            })}
          </div>

          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onClear}>
              Quitar filtros
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
