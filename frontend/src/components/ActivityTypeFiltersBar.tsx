import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { Button } from '@/components/ui/button';
import {
  ACTIVITY_TYPE_FILTER_CHIPS,
  type ActivityListFilter,
} from '@/lib/activityTypeFilter';

type ActivityTypeFiltersBarProps = {
  type: ActivityListFilter;
  onTypeChange: (next: ActivityListFilter) => void;
  onClear: () => void;
};

/** Chips Todas / Capsules / Listas en el feed de actividad. */
export function ActivityTypeFiltersBar({
  type,
  onTypeChange,
  onClear,
}: ActivityTypeFiltersBarProps) {
  return (
    <section className="space-y-3" aria-label="Filtros de actividad" data-testid="activity-type-filters">
      <div className={filterChipRowClass} role="group" aria-label="Filtrar por tipo">
        {ACTIVITY_TYPE_FILTER_CHIPS.map((chip) => {
          const active = type === chip.value;
          return (
            <FilterChip
              key={chip.label}
              active={active}
              onClick={() => onTypeChange(chip.value)}
            >
              {chip.label}
            </FilterChip>
          );
        })}
      </div>

      {type ? (
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onClear}>
          Quitar filtro
        </Button>
      ) : null}
    </section>
  );
}
