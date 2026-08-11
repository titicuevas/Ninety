import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ShareCollectionButton } from '@/components/ShareCollectionButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCapsules } from '@/hooks/useCapsules';
import {
  useAddCollectionItem,
  useCollectionDetail,
  useDeleteCollection,
  useRemoveCollectionItem,
  useReorderCollectionItems,
  useUpdateCollection,
} from '@/hooks/useCollections';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfile } from '@/hooks/useProfile';
import { resolveCollectionCoverUrl } from '@/lib/collectionCover';
import { moveCapsuleInOrder } from '@/lib/collectionReorder';
import { slugifyCollectionName } from '@/lib/collectionSlug';

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCollectionDetail(id);
  const { data: profile } = useProfile();
  const { data: myCapsules } = useCapsules();
  const updateCollection = useUpdateCollection(id ?? '');
  const deleteCollection = useDeleteCollection();
  const addItem = useAddCollectionItem(id ?? '');
  const removeItem = useRemoveCollectionItem(id ?? '');
  const reorderItems = useReorderCollectionItems(id ?? '');

  const collection = data?.collection;
  useDocumentTitle(collection?.name ? `Colección · ${collection.name}` : 'Colección');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [syncedId, setSyncedId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pickId, setPickId] = useState('');

  useEffect(() => {
    if (!collection || syncedId === collection.id) return;
    setName(collection.name);
    setDescription(collection.description ?? '');
    setIsPublic(collection.is_public);
    setSyncedId(collection.id);
  }, [collection, syncedId]);

  const inCollection = useMemo(
    () => new Set((data?.capsules ?? []).map((c) => c.id)),
    [data?.capsules],
  );

  const candidates = useMemo(
    () => (myCapsules?.capsules ?? []).filter((c) => !inCollection.has(c.id)),
    [myCapsules?.capsules, inCollection],
  );

  const username = profile?.username ?? data?.profile?.username;

  const orderedIds = useMemo(
    () => (data?.capsules ?? []).map((c) => c.id),
    [data?.capsules],
  );

  const moveCapsule = (capsuleId: string, direction: 'up' | 'down') => {
    if (!id || reorderItems.isPending) return;
    const next = moveCapsuleInOrder(orderedIds, capsuleId, direction);
    if (!next) return;
    reorderItems.mutate(next);
  };

  const coverUrl =
    collection?.cover_url ??
    resolveCollectionCoverUrl({
      coverCapsuleId: collection?.cover_capsule_id,
      capsules: data?.capsules ?? [],
    });

  const setCover = (capsuleId: string | null) => {
    if (!id || updateCollection.isPending) return;
    updateCollection.mutate({ cover_capsule_id: capsuleId });
  };

  const onSave = (event: FormEvent) => {
    event.preventDefault();
    if (!id || !name.trim()) return;
    updateCollection.mutate({
      name: name.trim(),
      description: description.trim() || null,
      is_public: isPublic,
      slug: slugifyCollectionName(name.trim()),
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <NinetyLoader variant="panel" />
      </Layout>
    );
  }

  if (isError || !collection) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'Colección no encontrada'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
          <Button asChild variant="secondary">
            <Link to="/collections">Volver a colecciones</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-8">
        <nav className="flex flex-wrap items-center gap-3" aria-label="Acciones de la colección">
          <Button asChild variant="ghost" size="sm">
            <Link to="/collections">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
              Colecciones
            </Link>
          </Button>
          {username && collection.is_public ? (
            <ShareCollectionButton
              username={username}
              slug={collection.slug}
              name={collection.name}
            />
          ) : null}
          {username && collection.is_public ? (
            <Button asChild variant="outline" size="sm">
              <Link
                to={`/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(collection.slug)}`}
              >
                Ver pública
              </Link>
            </Button>
          ) : null}
        </nav>

        {coverUrl ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={coverUrl}
              alt={`Portada de ${collection.name}`}
              className="aspect-[21/9] w-full object-cover"
            />
          </div>
        ) : null}

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base" id="edit-collection-heading">
              Editar colección
            </CardTitle>
            <CardDescription>
              {collection.items_count ?? data.capsules.length} Capsules · slug{' '}
              <code className="text-xs">{collection.slug}</code>
              {collection.cover_capsule_id ? ' · portada destacada' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSave}
              className="space-y-4"
              aria-labelledby="edit-collection-heading"
            >
              <FormField label="Nombre">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </FormField>
              <FormField label="Descripción">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                <Button type="submit" loading={updateCollection.isPending}>
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  aria-label={`Eliminar colección ${collection.name}`}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Eliminar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-4" aria-labelledby="collection-items-heading">
          <div>
            <h2 id="collection-items-heading" className="text-lg font-semibold">
              Capsules en la lista
            </h2>
            {data.capsules.length > 1 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Ordena con subir/bajar y elige una portada: así se verá en la lista pública.
              </p>
            ) : data.capsules.length === 1 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Puedes destacar esta Capsule como portada de la colección.
              </p>
            ) : null}
          </div>

          {candidates.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <FormField label="Añadir Capsule">
                  <select
                    value={pickId}
                    onChange={(e) => setPickId(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    aria-label="Elegir Capsule"
                  >
                    <option value="">Elige un partido…</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.home_team_name} vs {c.away_team_name}
                        {c.watched_at ? ` · ${c.watched_at}` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <Button
                type="button"
                disabled={!pickId || addItem.isPending}
                loading={addItem.isPending}
                onClick={() => {
                  if (!pickId) return;
                  addItem.mutate(pickId, { onSuccess: () => setPickId('') });
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Añadir
              </Button>
            </div>
          ) : null}

          {data.capsules.length === 0 ? (
            <EmptyState
              title="Lista vacía"
              description={
                candidates.length > 0
                  ? 'Elige un partido arriba o ábrelo en el diario y usa «Añadir a colección».'
                  : 'Aún no tienes Capsules. Busca un partido y guárdalo en tu diario.'
              }
            >
              {candidates.length === 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/search">Buscar partido</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to="/capsules">Mis Capsules</Link>
                  </Button>
                </div>
              ) : null}
            </EmptyState>
          ) : (
            <ul className="space-y-3" data-testid="collection-items">
              {data.capsules.map((capsule, index) => (
                <li key={capsule.id}>
                  <CapsuleListCard
                    capsule={capsule}
                    showWatchedDate
                    footer={
                      <div className="flex flex-wrap items-center gap-2">
                        {data.capsules.length > 1 ? (
                          <div className="flex items-center gap-1" role="group" aria-label="Reordenar">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={index === 0 || reorderItems.isPending}
                              aria-label={`Subir ${capsule.home_team_name} vs ${capsule.away_team_name}`}
                              onClick={() => moveCapsule(capsule.id, 'up')}
                            >
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                index === data.capsules.length - 1 || reorderItems.isPending
                              }
                              aria-label={`Bajar ${capsule.home_team_name} vs ${capsule.away_team_name}`}
                              onClick={() => moveCapsule(capsule.id, 'down')}
                            >
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </div>
                        ) : null}
                        {collection.cover_capsule_id === capsule.id ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={updateCollection.isPending || removeItem.isPending}
                            aria-label={`Quitar portada de ${capsule.home_team_name} vs ${capsule.away_team_name}`}
                            onClick={() => setCover(null)}
                          >
                            <ImageIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                            Quitar portada
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={updateCollection.isPending || removeItem.isPending}
                            aria-label={`Usar ${capsule.home_team_name} vs ${capsule.away_team_name} como portada`}
                            onClick={() => setCover(capsule.id)}
                          >
                            <ImageIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                            Portada
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={removeItem.isPending || reorderItems.isPending}
                          aria-label={`Quitar ${capsule.home_team_name} vs ${capsule.away_team_name} de la colección`}
                          onClick={() => removeItem.mutate(capsule.id)}
                        >
                          Quitar
                        </Button>
                      </div>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="¿Eliminar esta colección?"
        description="Se borrará la lista. Tus Capsules no se eliminan."
        confirmLabel="Eliminar"
        busy={deleteCollection.isPending}
        onConfirm={() => {
          if (!id) return;
          deleteCollection.mutate(id, {
            onSuccess: () => navigate('/collections', { replace: true }),
          });
        }}
        onCancel={() => {
          if (!deleteCollection.isPending) setDeleteOpen(false);
        }}
      />
    </Layout>
  );
}
