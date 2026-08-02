import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { MatchSearchPanel } from '@/components/MatchSearchPanel';
import { PeopleSearchPanel } from '@/components/PeopleSearchPanel';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';

type SearchTab = 'matches' | 'people';

export function SearchMatchPage() {
  const [params, setParams] = useSearchParams();
  const tab: SearchTab = params.get('tab') === 'people' ? 'people' : 'matches';
  useDocumentTitle(tab === 'people' ? 'Buscar aficionados' : 'Buscar partido');

  const setTab = (next: SearchTab) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'people') nextParams.set('tab', 'people');
    else nextParams.delete('tab');
    setParams(nextParams, { replace: true });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buscar</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Partidos para tu diario o aficionados para seguir.
          </p>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Tipo de búsqueda">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'matches'}
              onClick={() => setTab('matches')}
              className={cn(
                'min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                tab === 'matches'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              Partidos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'people'}
              onClick={() => setTab('people')}
              className={cn(
                'min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                tab === 'people'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              Aficionados
            </button>
          </div>
        </section>

        {tab === 'people' ? <PeopleSearchPanel /> : <MatchSearchPanel />}
      </div>
    </Layout>
  );
}
