import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Search, Ticket } from 'lucide-react';
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
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Listas</p>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-3xl">
              Quiero ir
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Partidos que te interesan ver — una watchlist personal, al estilo Letterboxd.
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link to="/search">
              <Search className="mr-1.5 h-4 w-4" aria-hidden />
              Buscar partidos
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
            description="En la búsqueda, marca «Quiero ir» en los partidos que te apetezcan ver. También puedes añadir partidos manuales."
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
          <ul className="space-y-3">
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
                      onClick={() => openCapsuleOrCreate(item.match_id)}
                    >
                      <Ticket className="mr-1.5 h-4 w-4" aria-hidden />
                      {capsuleId ? 'Ver Capsule' : 'Crear Capsule'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={remove.isPending && remove.variables === item.match_id}
                      onClick={() => remove.mutate(item.match_id)}
                    >
                      Quitar
                    </Button>
                  </div>
                  <WantToGoInCommon matchId={item.match_id} className="pl-1" />
                </li>
              );
            })}
          </ul>
        ) : null}

        {data && data.total > 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            {data.total} partido{data.total === 1 ? '' : 's'} en Quiero ir
          </p>
        ) : null}
      </div>
    </Layout>
  );
}
