import { FilterChip } from '@/components/FilterChip';
import { Button } from '@/components/ui/button';
import { FEED_COMPETITION_CHIPS } from '@/lib/feedParams';

type FeedContentFiltersBarProps = {
  photosOnly: boolean;
  competition: string;
  hasFilters: boolean;
  onPhotosOnlyChange: (next: boolean) => void;
  onCompetitionChange: (next: string) => void;
  onClear: () => void;
};

/** Filtros de contenido del feed: solo fotos + competición. */
export function FeedContentFiltersBar({
  photosOnly,
  competition,
  hasFilters,
  onPhotosOnlyChange,
  onCompetitionChange,
  onClear,
}: FeedContentFiltersBarProps) {
  return (
    <section className="space-y-3" aria-label="Filtros del feed">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por fotos">
        <FilterChip active={!photosOnly} onClick={() => onPhotosOnlyChange(false)}>
          Todas
        </FilterChip>
        <FilterChip active={photosOnly} onClick={() => onPhotosOnlyChange(!photosOnly)}>
          Solo con fotos
        </FilterChip>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por competición">
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
    </section>
  );
}
