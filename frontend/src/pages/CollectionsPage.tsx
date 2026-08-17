import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Library, Lock, Plus } from 'lucide-react';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCollection, useMyCollections } from '@/hooks/useCollections';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfile } from '@/hooks/useProfile';
import { slugifyCollectionName } from '@/lib/collectionSlug';
import {
  postImportCollectionsHint,
  readDiaryPostImportState,
} from '@/lib/diaryPostImportMemory';
import { toast } from '@/lib/toast';

export function CollectionsPage() {
  useDocumentTitle('Mis listas');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyCollections();
  const { data: profile } = useProfile();
  const createCollection = useCreateCollection();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [formOpen, setFormOpen] = useState(() => searchParams.get('new') === '1');

  const collections = data?.collections ?? [];
  const username = profile?.username;
  const postImportHint = user?.id
    ? postImportCollectionsHint(readDiaryPostImportState(user.id))
    : null;

  const openForm = (open: boolean) => {
    setFormOpen(open);
    if (open && searchParams.get('new') === '1') return;
    if (!open && searchParams.has('new')) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  };

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
      onSuccess: (result) => {
        setName('');
        setDescription('');
        setIsPublic(true);
        openForm(false);
        toast.success('Colección creada');
        navigate(`/collections/${result.collection.id}`);
      },
    });
  };

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        <section
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          aria-labelledby="collections-heading"
        >
          <div>
            <h1
              id="collections-heading"
              className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              <Library className="h-7 w-7 text-primary" aria-hidden />
              Mis listas
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="secondary" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to="/collections/likes">
                <Heart className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1.5">Me gusta</span>
              </Link>
            </Button>
            <Button
              type="button"
              className="h-9 w-9 shrink-0 px-0 sm:w-auto sm:px-3"
              aria-expanded={formOpen}
              aria-controls="create-collection-panel"
              onClick={() => openForm(!formOpen)}
            >
              <Plus className="h-4 w-4 sm:mr-1.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Nueva colección</span>
            </Button>
          </div>
        </section>

        {formOpen ? (
          <Card className="max-w-2xl border-border" id="create-collection-panel">
            <CardHeader>
              <CardTitle className="text-base" id="create-collection-heading">
                Crear colección
              </CardTitle>
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
              <form
                onSubmit={onCreate}
                className="space-y-4"
                aria-labelledby="create-collection-heading"
              >
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
                    onClick={() => openForm(false)}
                    disabled={createCollection.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? <NinetyLoader variant="panel" className="py-10" /> : null}

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
            description={
              postImportHint ?? 'Agrupa Capsules en listas y compártelas.'
            }
          >
            <Button type="button" onClick={() => openForm(true)}>
              Crear la primera
            </Button>
            {postImportHint ? (
              <Button asChild variant="secondary">
                <Link to="/feed?scope=explore">Ver el feed</Link>
              </Button>
            ) : null}
          </EmptyState>
        ) : null}

        {!isLoading && !isError && collections.length > 0 ? (
          <section aria-labelledby="collections-list-heading">
            <h2 id="collections-list-heading" className="sr-only">
              Tus colecciones
            </h2>
            <ul className={capsuleCardListClass}>
              {collections.map((collection) => (
                <li key={collection.id}>
                  <Link
                    to={`/collections/${collection.id}`}
                    className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start gap-3">
                      {collection.cover_url ? (
                        <img
                          src={collection.cover_url}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                          aria-hidden
                        >
                          <Library className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
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
                          {profile?.featured_collection_id === collection.id ? (
                            <span className="ml-2 text-primary">· Destacada</span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Layout>
  );
}
