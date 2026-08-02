import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Library, Lock, Plus } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCollection, useMyCollections } from '@/hooks/useCollections';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfile } from '@/hooks/useProfile';
import { slugifyCollectionName } from '@/lib/collectionSlug';

export function CollectionsPage() {
  useDocumentTitle('Colecciones');
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyCollections();
  const { data: profile } = useProfile();
  const createCollection = useCreateCollection();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const collections = data?.collections ?? [];
  const username = profile?.username;

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    createCollection.mutate({
      name: trimmed,
      description: description.trim() || null,
      is_public: isPublic,
      slug: slugifyCollectionName(trimmed),
    }, {
      onSuccess: () => {
        setName('');
        setDescription('');
        setIsPublic(true);
        setFormOpen(false);
      },
    });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Library className="h-7 w-7 text-primary" aria-hidden />
              Colecciones
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Listas curadas de Capsules — Clásicos, viajes, noches de Champions…
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0"
            onClick={() => setFormOpen((open) => !open)}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Nueva colección
          </Button>
        </section>

        {formOpen ? (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Crear colección</CardTitle>
              <CardDescription>
                El enlace público será{' '}
                {username ? (
                  <code className="text-xs text-primary">
                    /u/{username}/lists/{slugifyCollectionName(name || 'coleccion')}
                  </code>
                ) : (
                  'visible cuando tengas username'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onCreate} className="space-y-4">
                <FormField label="Nombre">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Clásicos"
                    maxLength={80}
                    required
                    autoFocus
                  />
                </FormField>
                <FormField label="Descripción (opcional)">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Los derbis y finales que más me marcaron"
                    maxLength={500}
                    rows={3}
                  />
                </FormField>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Pública (compartible)
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" loading={createCollection.isPending}>
                    Crear
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setFormOpen(false)}
                    disabled={createCollection.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando colecciones…</p>
        ) : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudieron cargar las colecciones'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isLoading && !isError && collections.length === 0 ? (
          <EmptyState
            icon={Library}
            title="Aún no tienes colecciones"
            description="Agrupa Capsules en listas como Clásicos o Viajes y compártelas."
          >
            <Button type="button" onClick={() => setFormOpen(true)}>
              Crear la primera
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && collections.length > 0 ? (
          <ul className="space-y-3">
            {collections.map((collection) => (
              <li key={collection.id}>
                <Link
                  to={`/collections/${collection.id}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{collection.name}</p>
                      {collection.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {collection.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {collection.items_count ?? 0}{' '}
                        {(collection.items_count ?? 0) === 1 ? 'Capsule' : 'Capsules'}
                        {!collection.is_public ? (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" aria-hidden />
                            Privada
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/capsules" className="text-primary hover:underline">
            Volver a Mis Capsules
          </Link>
        </p>
      </div>
    </Layout>
  );
}
