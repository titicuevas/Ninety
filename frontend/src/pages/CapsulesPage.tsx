import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { CapsuleDiaryFilters } from '@/components/CapsuleDiaryFilters';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { CapsuleListSkeleton } from '@/components/ListSkeletons';
import { Layout } from '@/components/Layout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ShareCapsuleButton } from '@/components/ShareCapsuleButton';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCapsules, useDeleteCapsule, useMyCapsulesInfinite } from '@/hooks/useCapsules';
import { useDiaryFilterParams } from '@/hooks/useDiaryFilterParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { listCapsuleYears } from '@/lib/capsuleStats';
import type { Capsule } from '@/types/capsule';

function CapsuleCard({ capsule, onDelete }: { capsule: Capsule; onDelete: (id: string) => void }) {
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;
  const isPublic = capsule.is_public !== false;

  return (
    <CapsuleListCard
      capsule={capsule}
      showWatchedDate
      badges={
        !isPublic ? (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Privada
          </span>
        ) : null
      }
      footer={
        <>
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
        </>
      }
    />
  );
}

export function CapsulesPage() {
  useDocumentTitle('Mis Capsules');
  const {
    q,
    qDraft,
    setQDraft,
    year,
    ratingMin,
    watchContext,
    visibility,
    hasFilters,
    patchParams,
    clearFilters,
  } = useDiaryFilterParams({ withVisibility: true });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  const diaryEmpty = !hasFilters && !isLoading && !isError && total === 0;
  const filterEmpty = hasFilters && !isLoading && !isError && capsules.length === 0;

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

        <CapsuleDiaryFilters
          years={years}
          showVisibility
          searchAriaLabel="Buscar en tus Capsules"
          qDraft={qDraft}
          year={year}
          ratingMin={ratingMin}
          watchContext={watchContext}
          visibility={visibility}
          hasFilters={hasFilters}
          isUpdating={isFetching && !isFetchingNextPage}
          onQDraftChange={setQDraft}
          patchParams={patchParams}
          clearFilters={clearFilters}
        />

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
