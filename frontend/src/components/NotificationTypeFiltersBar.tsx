import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { Button } from '@/components/ui/button';
import {
  NOTIFICATION_TYPE_FILTER_CHIPS,
  type NotificationListFilter,
} from '@/lib/notificationTypeFilter';

type NotificationTypeFiltersBarProps = {
  type: NotificationListFilter;
  onTypeChange: (next: NotificationListFilter) => void;
  onClear: () => void;
};

/** Chips Todas / Me gusta / Comentarios / Seguidores en el centro de alertas. */
export function NotificationTypeFiltersBar({
  type,
  onTypeChange,
  onClear,
}: NotificationTypeFiltersBarProps) {
  return (
    <section className="space-y-3" aria-label="Filtros de alertas" data-testid="notification-type-filters">
      <div className={filterChipRowClass} role="group" aria-label="Filtrar por tipo">
        {NOTIFICATION_TYPE_FILTER_CHIPS.map((chip) => {
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
