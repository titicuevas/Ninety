import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DiaryVisibility } from '@/lib/diaryFilters';
import { cn } from '@/lib/utils';
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
  /**
   * Perfil público: búsqueda siempre visible; chips detrás de «Filtros»
   * para no empujar el diario fuera del primer pantallazo.
   */
  collapsible?: boolean;
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

const EMPTY_TAGS: string[] = [];

function activeFilterSummaries(opts: {
  year: number | undefined;
  ratingMin: number | undefined;
  watchContext: WatchContext | undefined;
  tag: string | undefined;
  visibility: DiaryVisibility;
  showVisibility: boolean;
  qDraft: string;
}): string[] {
  const labels: string[] = [];
  const q = opts.qDraft.trim();
  if (q.length >= 2) labels.push(`“${q.length > 18 ? `${q.slice(0, 18)}…` : q}”`);
  if (opts.year != null) labels.push(String(opts.year));
  if (opts.ratingMin != null) labels.push(`${opts.ratingMin}+ ★`);
  if (opts.showVisibility && opts.visibility !== 'all') {
    labels.push(opts.visibility === 'public' ? 'Públicas' : 'Privadas');
  }
  if (opts.watchContext) labels.push(WATCH_CONTEXT_LABELS[opts.watchContext]);
  if (opts.tag) labels.push(opts.tag);
  return labels;
}

export function CapsuleDiaryFilters({
  years,
  availableTags = EMPTY_TAGS,
  showVisibility = false,
  collapsible = false,
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
  const [open, setOpen] = useState(() => !collapsible || hasFilters);
  const chipsVisible = !collapsible || open;
  const summaries = activeFilterSummaries({
    year,
    ratingMin,
    watchContext,
    tag,
    visibility,
    showVisibility,
    qDraft,
  });

  return (
    <section className="space-y-3" aria-label={ariaLabel}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
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

        {collapsible ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 gap-1.5 self-start sm:self-auto"
            aria-expanded={chipsVisible}
            aria-controls="diary-filter-chips"
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
        ) : null}
      </div>

      {collapsible && !chipsVisible && summaries.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {summaries.map((label) => (
            <span
              key={label}
              className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {label}
            </span>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar
          </Button>
          {isUpdating ? (
            <span className="text-xs text-muted-foreground">Actualizando…</span>
          ) : null}
        </div>
      ) : null}

      {chipsVisible ? (
        <div id="diary-filter-chips" className="space-y-3">
          {years.length > 0 ? (
            <div className={filterChipRowClass} role="group" aria-label="Filtrar por año">
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

          <div className={filterChipRowClass} role="group" aria-label="Filtrar por valoración">
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
            <div className={filterChipRowClass} role="group" aria-label="Filtrar por visibilidad">
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

          <div className={filterChipRowClass} role="group" aria-label="Filtrar por contexto">
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
            <div className={filterChipRowClass} role="group" aria-label="Filtrar por etiqueta">
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
        </div>
      ) : null}
    </section>
  );
}
