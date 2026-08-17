import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, Search, Ticket, X } from 'lucide-react';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { NinetyLoader } from '@/components/NinetyLoader';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { WantToGoButton } from '@/components/WantToGoButton';
import { WantToGoInCommon } from '@/components/WantToGoInCommon';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCapsules } from '@/hooks/useCapsules';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useClearPlayedWantToGo, useRemoveWantToGo, useWantToGoList } from '@/hooks/useWantToGo';
import { saveDraftMatch } from '@/lib/draftMatch';
import {
  parseWantToGoWhenParam,
  partitionWantToGoMatches,
  playedWantToGoWithoutCapsule,
  wantToGoDocumentTitle,
  WANT_TO_GO_WHEN_CHIPS,
  wantToGoToFootballMatch,
  type WantToGoWhenFilter,
} from '@/lib/wantToGo';
import type { WantToGoMatch } from '@/types/wantToGo';

const EMPTY_WANT_TO_GO: WantToGoMatch[] = [];

function WantToGoMatchItem({
  item,
  capsuleId,
  onOpen,
  onRemove,
  removing,
}: {
  item: WantToGoMatch;
  capsuleId?: string;
  onOpen: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const match = wantToGoToFootballMatch(item);

  return (
    <li className="space-y-2">
      <MatchCard match={match} savedCapsuleId={capsuleId} onSelect={onOpen} wantToGo />
      <div className="flex flex-wrap gap-2 pl-1">
        <WantToGoButton match={match} saved />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 w-9 px-0 sm:w-auto sm:px-3"
          aria-label={capsuleId ? 'Ver Capsule' : 'Crear Capsule'}
          onClick={onOpen}
        >
          <Ticket className="h-4 w-4 sm:mr-1.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">{capsuleId ? 'Ver Capsule' : 'Crear Capsule'}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 w-9 px-0 text-muted-foreground sm:w-auto sm:px-3"
          aria-label="Quitar de Quiero ir"
          disabled={removing}
          onClick={onRemove}
        >
          <X className="h-4 w-4 sm:mr-1.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">Quitar</span>
        </Button>
      </div>
      <WantToGoInCommon matchId={item.match_id} className="pl-1" />
    </li>
  );
}

function WantToGoMatchList({
  items,
  savedByMatchId,
  onOpen,
  onRemove,
  removingId,
}: {
  items: WantToGoMatch[];
  savedByMatchId: Map<number, string>;
  onOpen: (matchId: number) => void;
  onRemove: (matchId: number) => void;
  removingId?: number;
}) {
  return (
    <ul className={capsuleCardListClass}>
      {items.map((item) => (
        <WantToGoMatchItem
          key={item.match_id}
          item={item}
          capsuleId={savedByMatchId.get(item.match_id)}
          onOpen={() => onOpen(item.match_id)}
          onRemove={() => onRemove(item.match_id)}
          removing={removingId === item.match_id}
        />
      ))}
    </ul>
  );
}

export function WantToGoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const when = parseWantToGoWhenParam(searchParams.get('when'));
  useDocumentTitle(wantToGoDocumentTitle(when));
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch, isRefetching } = useWantToGoList();
  const { data: capsulesData } = useCapsules();
  const remove = useRemoveWantToGo();
  const clearPlayed = useClearPlayedWantToGo();
  const [confirmClear, setConfirmClear] = useState(false);

  const savedByMatchId = useMemo(() => {
    const map = new Map<number, string>();
    for (const capsule of capsulesData?.capsules ?? []) {
      map.set(capsule.match_id, capsule.id);
    }
    return map;
  }, [capsulesData?.capsules]);

  const items = data?.items ?? EMPTY_WANT_TO_GO;
  const { upcoming, played } = useMemo(() => partitionWantToGoMatches(items), [items]);
  const stalePlayed = useMemo(
    () => playedWantToGoWithoutCapsule(items, new Set(savedByMatchId.keys())),
    [items, savedByMatchId],
  );

  const visibleUpcoming = when === 'played' ? [] : upcoming;
  const visiblePlayed = when === 'upcoming' ? [] : played;
  const visibleCount = visibleUpcoming.length + visiblePlayed.length;
  const showSections = when === 'all' && upcoming.length > 0 && played.length > 0;

  const setWhen = (next: WantToGoWhenFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('when');
    else params.set('when', next);
    setSearchParams(params, { replace: true });
  };

  const openCapsuleOrCreate = (matchId: number) => {
    const item = items.find((row) => row.match_id === matchId);
    if (!item) return;
    const existingId = savedByMatchId.get(matchId);
    if (existingId) {
      navigate(`/c/${existingId}`);
      return;
    }
    const match = wantToGoToFootballMatch(item);
    saveDraftMatch(match);
    navigate('/capsules/new', { state: { match } });
  };

  const emptyTitle =
    when === 'upcoming'
      ? 'Sin próximos partidos'
      : when === 'played'
        ? 'Nada ya jugado'
        : 'Tu lista está vacía';
  const emptyDescription =
    when === 'upcoming'
      ? 'Los que ya se jugaron están en Ya jugados. Añade más desde Buscar.'
      : when === 'played'
        ? 'Cuando pase un partido de la lista, aparecerá aquí.'
        : 'Marca «Quiero ir» al buscar un partido, o añade uno manual.';

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quiero ir</h1>
            {data && data.total > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {data.total} partido{data.total === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>
          <Button asChild variant="secondary" className="h-9 w-9 shrink-0 px-0 sm:w-auto sm:px-3">
            <Link to="/search">
              <Search className="h-4 w-4 sm:mr-1.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Buscar partidos</span>
            </Link>
          </Button>
        </section>

        {!isLoading && !isError && items.length > 0 ? (
          <section className="space-y-3" aria-label="Filtros de Quiero ir">
            <div className={filterChipRowClass} role="group" aria-label="Próximos o ya jugados">
              {WANT_TO_GO_WHEN_CHIPS.map((chip) => {
                const count =
                  chip.value === 'upcoming'
                    ? upcoming.length
                    : chip.value === 'played'
                      ? played.length
                      : items.length;
                return (
                  <FilterChip
                    key={chip.value}
                    active={when === chip.value}
                    onClick={() => setWhen(chip.value)}
                  >
                    {chip.label} ({count})
                  </FilterChip>
                );
              })}
            </div>
            {stalePlayed.length > 0 && when !== 'upcoming' ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmClear(true)}
              >
                Limpiar ya jugados sin Capsule ({stalePlayed.length})
              </Button>
            ) : null}
          </section>
        ) : null}

        {isLoading ? <NinetyLoader label="Cargando Quiero ir…" /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudo cargar Quiero ir'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isLoading && !isError && items.length === 0 ? (
          <EmptyState icon={Bookmark} title={emptyTitle} description={emptyDescription}>
            <Button asChild>
              <Link to="/search">Ir a buscar</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/search/manual">Partido manual</Link>
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && items.length > 0 && visibleCount === 0 ? (
          <EmptyState icon={Bookmark} title={emptyTitle} description={emptyDescription}>
            <Button type="button" variant="secondary" onClick={() => setWhen('all')}>
              Ver todos
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && visibleUpcoming.length > 0 ? (
          <section className="space-y-3" aria-labelledby={showSections ? 'want-to-go-upcoming' : undefined}>
            {showSections ? (
              <h2 id="want-to-go-upcoming" className="text-sm font-semibold tracking-wide text-primary uppercase">
                Próximos
              </h2>
            ) : null}
            <WantToGoMatchList
              items={visibleUpcoming}
              savedByMatchId={savedByMatchId}
              onOpen={openCapsuleOrCreate}
              onRemove={(matchId) => remove.mutate(matchId)}
              removingId={remove.isPending ? remove.variables : undefined}
            />
          </section>
        ) : null}

        {!isLoading && !isError && visiblePlayed.length > 0 ? (
          <section className="space-y-3" aria-labelledby={showSections ? 'want-to-go-played' : undefined}>
            {showSections ? (
              <h2 id="want-to-go-played" className="text-sm font-semibold tracking-wide text-primary uppercase">
                Ya jugados
              </h2>
            ) : null}
            <WantToGoMatchList
              items={visiblePlayed}
              savedByMatchId={savedByMatchId}
              onOpen={openCapsuleOrCreate}
              onRemove={(matchId) => remove.mutate(matchId)}
              removingId={remove.isPending ? remove.variables : undefined}
            />
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="¿Limpiar ya jugados sin Capsule?"
        description={
          stalePlayed.length === 1
            ? 'Se quitará 1 partido ya jugado del que no tienes Capsule. Los que sí guardaste se quedan.'
            : `Se quitarán ${stalePlayed.length} partidos ya jugados de los que no tienes Capsule. Los que sí guardaste se quedan.`
        }
        confirmLabel="Limpiar"
        busy={clearPlayed.isPending}
        onConfirm={() => {
          clearPlayed.mutate(undefined, {
            onSuccess: () => setConfirmClear(false),
          });
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </Layout>
  );
}
