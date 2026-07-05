import { useState } from 'react';
import { Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function SearchMatchPage() {
  const [query, setQuery] = useState('');

  return (
    <Layout>
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buscar partido</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Encuentra un partido que hayas visto. Mañana conectamos los resultados reales.
          </p>
        </section>

        <section className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej. Real Madrid, Barcelona, Champions..."
            className="pl-9"
            autoFocus
            aria-label="Buscar partido por equipos o competición"
          />
        </section>

        <Card className="border-dashed">
          <CardContent className="p-6 text-center sm:p-10">
            {query.trim() ? (
              <>
                <p className="text-lg font-medium">Búsqueda preparada</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Buscando «{query.trim()}» — los resultados llegarán en el siguiente paso.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">¿Qué partido viste?</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Escribe el nombre de un equipo o rival. Aquí aparecerán los partidos.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
