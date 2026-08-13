import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Search, Ticket, X } from 'lucide-react';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { NinetyLoader } from '@/components/NinetyLoader';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { WantToGoButton } from '@/components/WantToGoButton';
import { WantToGoInCommon } from '@/components/WantToGoInCommon';
import { Button } from '@/components/ui/button';
import { useCapsules } from '@/hooks/useCapsules';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useRemoveWantToGo, useWantToGoList } from '@/hooks/useWantToGo';
import { saveDraftMatch } from '@/lib/draftMatch';
import { wantToGoToFootballMatch } from '@/lib/wantToGo';

export function WantToGoPage() {
  useDocumentTitle('Quiero ir');
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch, isRefetching } = useWantToGoList();
  const { data: capsulesData } = useCapsules();
  const remove = useRemoveWantToGo();

  const savedByMatchId = useMemo(() => {
    const map = new Map<number, string>();
    for (const capsule of capsulesData?.capsules ?? []) {
      map.set(capsule.match_id, capsule.id);
    }
    return map;
  }, [capsulesData?.capsules]);

  const items = data?.items ?? [];

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

        {isLoading ? <NinetyLoader label="Cargando Quiero ir…" /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudo cargar Quiero ir'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isLoading && !isError && items.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Tu lista está vacía"
            description="Marca «Quiero ir» al buscar un partido, o añade uno manual."
          >
            <Button asChild>
              <Link to="/search">Ir a buscar</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/search/manual">Partido manual</Link>
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && items.length > 0 ? (
          <ul className={capsuleCardListClass}>
            {items.map((item) => {
              const match = wantToGoToFootballMatch(item);
              const capsuleId = savedByMatchId.get(item.match_id);
              return (
                <li key={item.match_id} className="space-y-2">
                  <MatchCard
                    match={match}
                    savedCapsuleId={capsuleId}
                    onSelect={() => openCapsuleOrCreate(item.match_id)}
                    wantToGo
                  />
                  <div className="flex flex-wrap gap-2 pl-1">
                    <WantToGoButton match={match} saved />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-9 w-9 px-0 sm:w-auto sm:px-3"
                      aria-label={capsuleId ? 'Ver Capsule' : 'Crear Capsule'}
                      onClick={() => openCapsuleOrCreate(item.match_id)}
                    >
                      <Ticket className="h-4 w-4 sm:mr-1.5" aria-hidden />
                      <span className="sr-only sm:not-sr-only">
                        {capsuleId ? 'Ver Capsule' : 'Crear Capsule'}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 px-0 text-muted-foreground sm:w-auto sm:px-3"
                      aria-label="Quitar de Quiero ir"
                      disabled={remove.isPending && remove.variables === item.match_id}
                      onClick={() => remove.mutate(item.match_id)}
                    >
                      <X className="h-4 w-4 sm:mr-1.5" aria-hidden />
                      <span className="sr-only sm:not-sr-only">Quitar</span>
                    </Button>
                  </div>
                  <WantToGoInCommon matchId={item.match_id} className="pl-1" />
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Layout>
  );
}
