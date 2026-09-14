import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { CollectionsSearchPanel } from '@/components/CollectionsSearchPanel';
import { MatchSearchPanel } from '@/components/MatchSearchPanel';
import { PeopleSearchPanel } from '@/components/PeopleSearchPanel';
import { PublicLayout } from '@/components/PublicLayout';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  SEARCH_TABS,
  applySearchTab,
  parseSearchTab,
  searchTabDocumentTitle,
  type SearchTab,
} from '@/lib/searchTabs';
import { cn } from '@/lib/utils';

export function SearchMatchPage() {
  const { user } = useAuth();
  const Shell = user ? Layout : PublicLayout;
  const [params, setParams] = useSearchParams();
  const tab = parseSearchTab(params.get('tab'));
  useDocumentTitle(searchTabDocumentTitle(tab));

  const setTab = (next: SearchTab) => {
    setParams(applySearchTab(params, next), { replace: true });
  };

  return (
    <Shell>
      <div className="space-y-5 sm:space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buscar</h1>
          {!user ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Explora partidos, aficionados y listas. Para guardar una Capsule o marcar Quiero ir,
              crea una cuenta.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Tipo de búsqueda">
            {SEARCH_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  'min-h-9 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  tab === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {tab === 'people' ? (
          <PeopleSearchPanel />
        ) : tab === 'lists' ? (
          <CollectionsSearchPanel autoFocus testId="search-lists-panel" />
        ) : (
          <MatchSearchPanel />
        )}
      </div>
    </Shell>
  );
}
