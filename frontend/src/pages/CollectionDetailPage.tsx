import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { CapsuleCardSocialFooter } from '@/components/CapsuleCardSocialFooter';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { CollectionCardSocialFooter } from '@/components/CollectionCardSocialFooter';
import { CollectionComments } from '@/components/CollectionComments';
import { CollectionLikeButton } from '@/components/CollectionLikeButton';
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
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { capsuleShareSummaryFrom } from '@/lib/capsuleShare';
import { formatCollectionCardMeta } from '@/lib/collectionCardMeta';
import { resolveCollectionCoverUrl } from '@/lib/collectionCover';
import { moveCapsuleInOrder } from '@/lib/collectionReorder';
import { slugifyCollectionName } from '@/lib/collectionSlug';
import { toast } from '@/lib/toast';
import type { Collection, UpdateCollectionInput } from '@/types/collection';
import type { Capsule } from '@/types/capsule';

type CollectionEditFormProps = {
  collection: Collection;
  itemsCount: number;
  isSaving: boolean;
  isFeaturing: boolean;
  isFeatured: boolean;
  onSave: (input: UpdateCollectionInput) => void;
  onDelete: () => void;
  onFeatureToggle: () => void;
};

function CollectionEditForm({
  collection,
  itemsCount,
  isSaving,
  isFeaturing,
  isFeatured,
  onSave,
  onDelete,
  onFeatureToggle,
}: CollectionEditFormProps) {
  const [name, setName] = useState(() => collection.name);
  const [description, setDescription] = useState(() => collection.description ?? '');
  const [isPublic, setIsPublic] = useState(() => collection.is_public);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      is_public: isPublic,
      slug: slugifyCollectionName(name.trim()),
    });
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base" id="edit-collection-heading">
          Editar colección
        </CardTitle>
        <CardDescription>
          {formatCollectionCardMeta(
            collection.items_count ?? itemsCount,
            collection.likes_count ?? 0,
            collection.comments_count ?? 0,
          )}{' '}
          · slug <code className="text-xs">{collection.slug}</code>
          {collection.cover_capsule_id ? ' · portada destacada' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
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
            <Button type="submit" loading={isSaving}>
              Guardar
            </Button>
            {collection.is_public ? (
              <Button
                type="button"
                variant="secondary"
                loading={isFeaturing}
                onClick={onFeatureToggle}
              >
                {isFeatured ? 'Quitar del perfil' : 'Destacar en perfil'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              aria-label={`Eliminar colección ${collection.name}`}
              onClick={onDelete}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Eliminar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

type CollectionItemCapsule = Capsule & {
  likes_count?: number;
  liked_by_me?: boolean;
  comments_count?: number;
};

type CollectionItemsSectionProps = {
  collection: Collection;
  capsules: CollectionItemCapsule[];
  candidates: Capsule[];
  currentUserId?: string;
  pickId: string;
  onPickIdChange: (value: string) => void;
  onAddItem: (capsuleId: string) => void;
  addItemPending: boolean;
  onMoveCapsule: (capsuleId: string, direction: 'up' | 'down') => void;
  reorderPending: boolean;
  onSetCover: (capsuleId: string | null) => void;
  updateCollectionPending: boolean;
  onRemoveItem: (capsuleId: string) => void;
  removeItemPending: boolean;
};

function CollectionItemsSection({
  collection,
  capsules,
  candidates,
  currentUserId,
  pickId,
  onPickIdChange,
  onAddItem,
  addItemPending,
  onMoveCapsule,
  reorderPending,
  onSetCover,
  updateCollectionPending,
  onRemoveItem,
  removeItemPending,
}: CollectionItemsSectionProps) {
  return (
    <section className="space-y-4" aria-labelledby="collection-items-heading">
      <h2 id="collection-items-heading" className="text-lg font-semibold">
        Capsules en la lista
      </h2>

      {candidates.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <FormField label="Añadir Capsule">
              <select
                value={pickId}
                onChange={(e) => onPickIdChange(e.target.value)}
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
            disabled={!pickId || addItemPending}
            loading={addItemPending}
            onClick={() => {
              if (!pickId) return;
              onAddItem(pickId);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Añadir
          </Button>
        </div>
      ) : null}

      {capsules.length === 0 ? (
        <EmptyState
          title="Lista vacía"
          description={
            candidates.length > 0
              ? 'Elige un partido arriba para añadirlo.'
              : 'Busca un partido y guárdalo en tu diario.'
          }
        >
          {candidates.length === 0 ? (
            <Button asChild>
              <Link to="/search">Buscar partido</Link>
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <ul className="space-y-3" data-testid="collection-items">
          {capsules.map((capsule, index) => (
            <li key={capsule.id}>
              <CapsuleListCard
                capsule={capsule}
                showWatchedDate
                footerBordered
                footer={
                  <div className="flex w-full flex-col gap-3">
                    {collection.is_public ? (
                      <CapsuleCardSocialFooter
                        capsuleId={capsule.id}
                        capsuleOwnerId={capsule.user_id}
                        currentUserId={currentUserId}
                        likesCount={capsule.likes_count}
                        likedByMe={capsule.liked_by_me}
                        commentsCount={capsule.comments_count}
                        alsoWatched={capsule.also_watched}
                        shareTitle={`${capsule.home_team_name} vs ${capsule.away_team_name}`}
                        share={capsuleShareSummaryFrom(capsule)}
                        isPublic={capsule.is_public !== false}
                        showShare={false}
                      />
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                    {capsules.length > 1 ? (
                      <div className="flex items-center gap-1" role="group" aria-label="Reordenar">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === 0 || reorderPending}
                          aria-label={`Subir ${capsule.home_team_name} vs ${capsule.away_team_name}`}
                          onClick={() => onMoveCapsule(capsule.id, 'up')}
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === capsules.length - 1 || reorderPending}
                          aria-label={`Bajar ${capsule.home_team_name} vs ${capsule.away_team_name}`}
                          onClick={() => onMoveCapsule(capsule.id, 'down')}
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
                        className="h-9 w-9 px-0 sm:w-auto sm:px-3"
                        disabled={updateCollectionPending || removeItemPending}
                        aria-label={`Quitar portada de ${capsule.home_team_name} vs ${capsule.away_team_name}`}
                        onClick={() => onSetCover(null)}
                      >
                        <ImageIcon className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
                        <span className="sr-only sm:not-sr-only">Quitar portada</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 px-0 sm:w-auto sm:px-3"
                        disabled={updateCollectionPending || removeItemPending}
                        aria-label={`Usar ${capsule.home_team_name} vs ${capsule.away_team_name} como portada`}
                        onClick={() => onSetCover(capsule.id)}
                      >
                        <ImageIcon className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
                        <span className="sr-only sm:not-sr-only">Portada</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 px-0 text-destructive sm:w-auto sm:px-3"
                      disabled={removeItemPending || reorderPending}
                      aria-label={`Quitar ${capsule.home_team_name} vs ${capsule.away_team_name} de la colección`}
                      onClick={() => onRemoveItem(capsule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
                      <span className="sr-only sm:not-sr-only">Quitar</span>
                    </Button>
                    </div>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCollectionDetail(id);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: myCapsules } = useCapsules();
  const updateCollection = useUpdateCollection(id ?? '');
  const deleteCollection = useDeleteCollection();
  const addItem = useAddCollectionItem(id ?? '');
  const removeItem = useRemoveCollectionItem(id ?? '');
  const reorderItems = useReorderCollectionItems(id ?? '');

  const collection = data?.collection;
  useDocumentTitle(collection?.name ? `Colección · ${collection.name}` : 'Colección');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pickId, setPickId] = useState('');

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
        <nav className="flex flex-wrap items-center gap-2" aria-label="Acciones de la colección">
          <Button asChild variant="ghost" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
            <Link to="/collections">
              <ArrowLeft className="h-4 w-4 sm:mr-1.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Colecciones</span>
            </Link>
          </Button>
          {collection.is_public ? (
            <CollectionLikeButton
              collectionId={collection.id}
              likesCount={collection.likes_count}
              likedByMe={collection.liked_by_me}
            />
          ) : null}
          {username && collection.is_public ? (
            <ShareCollectionButton
              username={username}
              slug={collection.slug}
              name={collection.name}
              description={collection.description}
              authorDisplayName={profile?.display_name ?? username}
              itemsCount={data.capsules.length}
              likesCount={collection.likes_count}
              compact
            />
          ) : null}
          {username && collection.is_public ? (
            <Button asChild variant="outline" size="sm" className="h-9 px-3">
              <Link
                to={`/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(collection.slug)}`}
              >
                Ver pública
              </Link>
            </Button>
          ) : null}
        </nav>

        {collection.is_public ? (
          <CollectionCardSocialFooter
            collectionId={collection.id}
            ownerId={collection.user_id}
            currentUserId={profile?.id}
            likesCount={collection.likes_count}
            commentsCount={collection.comments_count}
          />
        ) : null}

        {coverUrl ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={coverUrl}
              alt={`Portada de ${collection.name}`}
              className="aspect-[21/9] w-full object-cover"
            />
          </div>
        ) : null}

        <CollectionEditForm
          key={collection.id}
          collection={collection}
          itemsCount={data.capsules.length}
          isSaving={updateCollection.isPending}
          isFeaturing={updateProfile.isPending}
          isFeatured={profile?.featured_collection_id === collection.id}
          onSave={(input) => updateCollection.mutate(input)}
          onDelete={() => setDeleteOpen(true)}
          onFeatureToggle={() => {
            const isFeatured = profile?.featured_collection_id === collection.id;
            updateProfile.mutate(
              { featured_collection_id: isFeatured ? null : collection.id },
              {
                onSuccess: () => {
                  toast.success(
                    isFeatured
                      ? 'Colección quitada del perfil'
                      : 'Colección destacada en tu perfil',
                  );
                },
              },
            );
          }}
        />

        <CollectionItemsSection
          collection={collection}
          capsules={data.capsules}
          candidates={candidates}
          currentUserId={profile?.id}
          pickId={pickId}
          onPickIdChange={setPickId}
          onAddItem={(capsuleId) => addItem.mutate(capsuleId, { onSuccess: () => setPickId('') })}
          addItemPending={addItem.isPending}
          onMoveCapsule={moveCapsule}
          reorderPending={reorderItems.isPending}
          onSetCover={setCover}
          updateCollectionPending={updateCollection.isPending}
          onRemoveItem={(capsuleId) => removeItem.mutate(capsuleId)}
          removeItemPending={removeItem.isPending}
        />

        {collection.is_public ? (
          <CollectionComments
            collectionId={collection.id}
            currentUserId={profile?.id}
            collectionOwnerId={collection.user_id}
            autoFocusComposer={false}
          />
        ) : null}
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
