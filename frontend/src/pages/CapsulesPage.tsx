import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, X } from 'lucide-react';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip } from '@/components/FilterChip';
import { CapsuleListSkeleton } from '@/components/ListSkeletons';
import { Layout } from '@/components/Layout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ShareCapsuleButton } from '@/components/ShareCapsuleButton';
import { StarRating } from '@/components/StarRating';
import { WatchContextBadge } from '@/components/WatchContextBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import {
  useCapsules,
  useDeleteCapsule,
  useMyCapsulesInfinite,
  type MyCapsulesVisibility,
} from '@/hooks/useCapsules';
import { listCapsuleYears } from '@/lib/capsuleStats';
import { formatWatchedDate } from '@/lib/format';
import {
  WATCH_CONTEXTS,
  WATCH_CONTEXT_LABELS,
  isWatchContext,
  type WatchContext,
} from '@/lib/watchContext';
import type { Capsule } from '@/types/capsule';

function formatScore(capsule: Capsule) {
  if (capsule.home_score == null || capsule.away_score == null) return null;
  return `${capsule.home_score} – ${capsule.away_score}`;
}

function CapsuleCard({ capsule, onDelete }: { capsule: Capsule; onDelete: (id: string) => void }) {
  const score = formatScore(capsule);
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;
  const isPublic = capsule.is_public !== false;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <CapsulePhotoGallery
          capsule={capsule}
          alt={`Foto del partido ${capsule.home_team_name} vs ${capsule.away_team_name}`}
          className="mb-4"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/c/${capsule.id}`} className="font-medium hover:text-primary hover:underline">
                {capsule.home_team_name}
              </Link>
              <WatchContextBadge context={capsule.watch_context} />
              {!isPublic ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Privada
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground">{capsule.away_team_name}</p>
            {capsule.competition_name ? (
              <p className="mt-1 text-xs text-primary">{capsule.competition_name}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            {score ? <p className="font-semibold tabular-nums">{score}</p> : null}
            <p className="mt-0.5 text-xs text-muted-foreground">Visto {formatWatchedDate(capsule.watched_at)}</p>
          </div>
        </div>

        {capsule.rating ? (
          <div className="mt-3">
            <StarRating rating={capsule.rating} />
          </div>
        ) : null}

        {capsule.note ? <p className="mt-3 text-sm text-muted-foreground">{capsule.note}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <ShareCapsuleButton
            capsuleId={capsule.id}
            title={shareTitle}
            variant="outline"
            isPublic={isPublic}
          />
          <Button asChild variant="secondary" size="sm">
            <Link to={`/capsules/${capsule.id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(capsule.id)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function parseYear(value: string | null): number | undefined {
  if (!value) return undefined;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1990 || year > 2100) return undefined;
  return year;
}

function parseRatingMin(value: string | null): number | undefined {
  if (!value) return undefined;
  const rating = Number(value);
  if (![3, 4, 5].includes(rating)) return undefined;
  return rating;
}

function parseVisibility(value: string | null): MyCapsulesVisibility {
  if (value === 'public' || value === 'private') return value;
  return 'all';
}

function parseWatchContext(value: string | null): WatchContext | undefined {
  return isWatchContext(value) ? value : undefined;
}

export function CapsulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [qDraft, setQDraft] = useState(() => searchParams.get('q') ?? '');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deferredQ = useDeferredValue(qDraft.trim());

  const year = parseYear(searchParams.get('year'));
  const ratingMin = parseRatingMin(searchParams.get('rating'));
  const visibility = parseVisibility(searchParams.get('visibility'));
  const watchContext = parseWatchContext(searchParams.get('context'));
  const q = deferredQ.length >= 2 ? deferredQ : '';

  const { data: allCapsulesData } = useCapsules();
  const years = useMemo(
    () => listCapsuleYears(allCapsulesData?.capsules ?? []),
    [allCapsulesData?.capsules],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch,
    isRefetching,
  } = useMyCapsulesInfinite({ q, year, ratingMin, visibility, watchContext });
  const deleteCapsule = useDeleteCapsule();
  const capsules = useMemo(
    () => data?.pages.flatMap((page) => page.capsules) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? capsules.length;

  const hasFilters =
    q.length >= 2 ||
    year != null ||
    ratingMin != null ||
    visibility !== 'all' ||
    watchContext != null;
  const diaryEmpty = !hasFilters && !isLoading && !isError && total === 0;
  const filterEmpty = hasFilters && !isLoading && !isError && capsules.length === 0;

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setQDraft('');
    setSearchParams({}, { replace: true });
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    deleteCapsule.mutate(id, {
      onSettled: () => setPendingDeleteId(null),
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis Capsules</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Todos los partidos que has guardado en tu diario.
              {!isLoading && (hasFilters || total > 0) ? (
                <>
                  {' '}
                  <span className="text-foreground">
                    {total} {total === 1 ? 'partido' : 'partidos'}
                    {hasFilters ? ' con estos filtros' : ''}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/search">Buscar partido</Link>
          </Button>
        </section>

        <section className="space-y-3" aria-label="Filtros del diario">
          <div className="relative">
            <Input
              value={qDraft}
              onChange={(e) => {
                const value = e.target.value;
                setQDraft(value);
                const trimmed = value.trim();
                patchParams({ q: trimmed.length >= 2 ? trimmed : null });
              }}
              placeholder="Buscar equipo, competición o nota…"
              aria-label="Buscar en tus Capsules"
            />
            {qDraft ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
                onClick={() => {
                  setQDraft('');
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
                onClick={() =>
                  patchParams({ visibility: value === 'all' ? null : value })
                }
              >
                {label}
              </FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por contexto">
            <FilterChip
              active={watchContext == null}
              onClick={() => patchParams({ context: null })}
            >
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

          {hasFilters ? (
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
              {isFetching && !isFetchingNextPage ? (
                <span className="text-xs text-muted-foreground">Actualizando…</span>
              ) : null}
            </div>
          ) : null}
        </section>

        {isLoading ? <CapsuleListSkeleton count={3} /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudieron cargar tus Capsules'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {diaryEmpty ? (
          <EmptyState
            title="Aún no tienes Capsules"
            description="Busca un partido que hayas visto y guarda tu primer recuerdo."
          >
            <Button asChild>
              <Link to="/search">Buscar partido</Link>
            </Button>
          </EmptyState>
        ) : null}

        {filterEmpty ? (
          <EmptyState
            title="Ningún partido con estos filtros"
            description="Prueba otro año, valoración o limpia la búsqueda."
          >
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && capsules.length > 0 ? (
          <div className="space-y-4">
            <ul className="space-y-3">
              {capsules.map((capsule) => (
                <li key={capsule.id}>
                  <CapsuleCard capsule={capsule} onDelete={handleDelete} />
                </li>
              ))}
            </ul>
            {hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  loading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  Cargar más
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title="¿Eliminar esta Capsule?"
        description="Se borrará de tu diario y no se puede deshacer."
        confirmLabel="Eliminar"
        busy={deleteCapsule.isPending}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteCapsule.isPending) setPendingDeleteId(null);
        }}
      />
    </Layout>
  );
}
