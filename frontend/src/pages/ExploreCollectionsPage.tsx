import { Compass } from 'lucide-react';
import { CollectionsSearchPanel } from '@/components/CollectionsSearchPanel';
import { Layout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ExploreCollectionsPage() {
  const { user } = useAuth();
  const Shell = user ? Layout : PublicLayout;
  useDocumentTitle('Explorar colecciones');

  return (
    <Shell>
      <div className="space-y-5 sm:space-y-8">
        <section aria-labelledby="explore-collections-heading" className="space-y-4">
          <h1
            id="explore-collections-heading"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            <Compass className="h-7 w-7 text-primary" aria-hidden />
            Explorar colecciones
          </h1>
        </section>
        <CollectionsSearchPanel />
      </div>
    </Shell>
  );
}
