import { X } from 'lucide-react';
import { FilterChip } from '@/components/FilterChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DiaryVisibility } from '@/lib/diaryFilters';
import {
  WATCH_CONTEXTS,
  WATCH_CONTEXT_LABELS,
  type WatchContext,
} from '@/lib/watchContext';

type CapsuleDiaryFiltersProps = {
  years: number[];
  /** Etiquetas disponibles en el diario (solo Mis Capsules). */
  availableTags?: string[];
  showVisibility?: boolean;
  searchAriaLabel: string;
  ariaLabel?: string;
  isUpdating?: boolean;
  qDraft: string;
  year: number | undefined;
  ratingMin: number | undefined;
  watchContext: WatchContext | undefined;
  tag?: string | undefined;
  visibility?: DiaryVisibility;
  hasFilters: boolean;
  onQDraftChange: (value: string) => void;
  patchParams: (patch: Record<string, string | null>) => void;
  clearFilters: () => void;
};

export function CapsuleDiaryFilters({
  years,
  availableTags = [],
  showVisibility = false,
  searchAriaLabel,
  ariaLabel = 'Filtros del diario',
  isUpdating = false,
  qDraft,
  year,
  ratingMin,
  watchContext,
  tag,
  visibility = 'all',
  hasFilters,
  onQDraftChange,
  patchParams,
  clearFilters,
}: CapsuleDiaryFiltersProps) {
  return (
    <section className="space-y-3" aria-label={ariaLabel}>
      <div className="relative">
        <Input
          value={qDraft}
          onChange={(e) => {
            const value = e.target.value;
            onQDraftChange(value);
            const trimmed = value.trim();
            patchParams({ q: trimmed.length >= 2 ? trimmed : null });
          }}
          placeholder="Buscar equipo, competición o nota…"
          aria-label={searchAriaLabel}
        />
        {qDraft ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              onQDraftChange('');
              patchParams({ q: null });
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {years.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por año">
          <FilterChip active={year == null} onClick={() => patchParams({ year: null })}>
            Todos los años
          </FilterChip>
          {years.map((y) => (
            <FilterChip
              key={y}
              active={year === y}
              onClick={() => patchParams({ year: year === y ? null : String(y) })}
            >
              {y}
            </FilterChip>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por valoración">
        <FilterChip active={ratingMin == null} onClick={() => patchParams({ rating: null })}>
          Cualquier ★
        </FilterChip>
        {[5, 4, 3].map((min) => (
          <FilterChip
            key={min}
            active={ratingMin === min}
            onClick={() => patchParams({ rating: ratingMin === min ? null : String(min) })}
          >
            {min}+ ★
          </FilterChip>
        ))}
      </div>

      {showVisibility ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por visibilidad">
          {(
            [
              ['all', 'Todas'],
              ['public', 'Públicas'],
              ['private', 'Privadas'],
            ] as const
          ).map(([value, label]) => (
            <FilterChip
              key={value}
              active={visibility === value}
              onClick={() => patchParams({ visibility: value === 'all' ? null : value })}
            >
              {label}
            </FilterChip>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por contexto">
        <FilterChip active={watchContext == null} onClick={() => patchParams({ context: null })}>
          Cualquier lugar
        </FilterChip>
        {WATCH_CONTEXTS.map((value) => (
          <FilterChip
            key={value}
            active={watchContext === value}
            onClick={() =>
              patchParams({ context: watchContext === value ? null : value })
            }
          >
            {WATCH_CONTEXT_LABELS[value]}
          </FilterChip>
        ))}
      </div>

      {availableTags.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por etiqueta">
          <FilterChip active={tag == null} onClick={() => patchParams({ tag: null })}>
            Cualquier etiqueta
          </FilterChip>
          {availableTags.map((value) => (
            <FilterChip
              key={value}
              active={tag === value}
              onClick={() => patchParams({ tag: tag === value ? null : value })}
            >
              {value}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {hasFilters ? (
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
          {isUpdating ? (
            <span className="text-xs text-muted-foreground">Actualizando…</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
