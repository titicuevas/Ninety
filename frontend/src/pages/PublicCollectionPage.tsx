import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Library } from 'lucide-react';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { CollectionComments } from '@/components/CollectionComments';
import { CollectionLikeButton } from '@/components/CollectionLikeButton';
import { CollectionLikersDialog } from '@/components/CollectionLikersDialog';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { PublicLayout } from '@/components/PublicLayout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ReportContentButton } from '@/components/ReportContentButton';
import { ShareCollectionButton } from '@/components/ShareCollectionButton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { usePublicCollection } from '@/hooks/useCollections';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatLikesPanelTitle } from '@/lib/collectionLikes';
import { publicProfilePath } from '@/lib/profilePath';

export function PublicCollectionPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { user } = useAuth();
  const { loginTo } = useAuthReturnLinks();
  const [guestLikersOpen, setGuestLikersOpen] = useState(false);
  const { data, isLoading, isError, error, refetch, isRefetching } = usePublicCollection(
    username,
    slug,
  );

  const collection = data?.collection;
  const profile = data?.profile;
  const displayName = profile?.display_name ?? profile?.username ?? username ?? 'Aficionado';
  const authorHref = publicProfilePath(profile?.username);
  const fallbackHref = publicProfilePath(username);

  useDocumentTitle(
    collection?.name ? `${collection.name} · ${displayName}` : 'Colección',
  );

  const Shell = user ? Layout : PublicLayout;

  if (isLoading) {
    return (
      <Shell>
        <NinetyLoader variant="panel" />
      </Shell>
    );
  }

  if (isError || !collection) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Colección no encontrada</h1>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'No existe esa lista pública.'}
          </p>
          {isError ? (
            <QueryErrorCard
              message={error instanceof Error ? error.message : 'Error al cargar'}
              loading={isRefetching}
              onRetry={() => void refetch()}
            />
          ) : null}
          <Button asChild variant="secondary">
            <Link to={fallbackHref ?? (user ? '/home' : '/')}>
              {fallbackHref ? 'Ver perfil' : 'Volver'}
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const capsules = data?.capsules ?? [];
  const likesCount = collection.likes_count ?? 0;
  const isOwn = !!user && user.id === collection.user_id;
  const coverUrl =
    collection.cover_url ??
    (capsules.find((c) => c.id === collection.cover_capsule_id)?.photo_urls?.[0] ??
      capsules.find((c) => (c.photo_urls?.length ?? 0) > 0)?.photo_urls?.[0] ??
      null);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-5 sm:space-y-8">
        {coverUrl ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={coverUrl}
              alt={`Portada de ${collection.name}`}
              className="aspect-[21/9] w-full object-cover"
            />
          </div>
        ) : null}
        <section className="space-y-2.5 text-center sm:text-left" aria-labelledby="public-collection-heading">
          <h1
            id="public-collection-heading"
            className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            <Library className="hidden h-6 w-6 shrink-0 text-primary sm:block" aria-hidden />
            {collection.name}
          </h1>
          {collection.description ? (
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Por{' '}
            {authorHref ? (
              <Link
                to={authorHref}
                className="font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {displayName}
              </Link>
            ) : (
              displayName
            )}
            {' · '}
            {capsules.length} {capsules.length === 1 ? 'partido' : 'partidos'}
          </p>
          <div
            className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"
            role="group"
            aria-label="Acciones de la colección"
          >
            {user ? (
              <CollectionLikeButton
                collectionId={collection.id}
                likesCount={likesCount}
                likedByMe={collection.liked_by_me}
              />
            ) : likesCount > 0 ? (
              <button
                type="button"
                className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setGuestLikersOpen(true)}
              >
                {formatLikesPanelTitle(likesCount)}
              </button>
            ) : null}
            {user && !isOwn ? (
              <ReportContentButton
                targetType="collection"
                targetId={collection.id}
                size="icon"
              />
            ) : null}
            {authorHref && profile?.username ? (
              <ShareCollectionButton
                username={profile.username}
                slug={collection.slug}
                name={collection.name}
                description={collection.description}
                authorDisplayName={displayName}
                itemsCount={capsules.length}
                likesCount={likesCount}
                compact
              />
            ) : null}
            {authorHref ? (
              <Button asChild variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
                <Link to={authorHref}>
                  <BookOpen className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
                  <span className="sr-only sm:not-sr-only">Ver diario</span>
                </Link>
              </Button>
            ) : null}
          </div>
          {!user ? (
            <p className="text-sm text-muted-foreground">
              <Link to={loginTo} className="text-primary hover:underline">
                Inicia sesión
              </Link>{' '}
              para dar me gusta o comentar.
            </p>
          ) : null}
        </section>

        {capsules.length === 0 ? (
          <EmptyState
            title="Colección vacía"
            description="Todavía no hay partidos públicos en esta lista."
          />
        ) : (
          <section aria-labelledby="public-collection-items-heading">
            <h2 id="public-collection-items-heading" className="sr-only">
              Partidos de la colección
            </h2>
            <ul className="space-y-3">
              {capsules.map((capsule) => (
                <li key={capsule.id}>
                  <CapsuleListCard capsule={capsule} showWatchedDate />
                </li>
              ))}
            </ul>
          </section>
        )}

        <CollectionComments
          collectionId={collection.id}
          currentUserId={user?.id}
          collectionOwnerId={profile?.id ?? collection.user_id}
        />
      </div>

      {!user ? (
        <CollectionLikersDialog
          open={guestLikersOpen}
          collectionId={collection.id}
          likesCount={likesCount}
          onClose={() => setGuestLikersOpen(false)}
        />
      ) : null}
    </Shell>
  );
}
