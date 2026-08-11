import { Link, useParams } from 'react-router-dom';
import { Library } from 'lucide-react';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { PublicLayout } from '@/components/PublicLayout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ShareCollectionButton } from '@/components/ShareCollectionButton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { usePublicCollection } from '@/hooks/useCollections';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { publicProfilePath } from '@/lib/profilePath';

export function PublicCollectionPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { user } = useAuth();
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
  const coverUrl =
    collection.cover_url ??
    (capsules.find((c) => c.id === collection.cover_capsule_id)?.photo_urls?.[0] ??
      capsules.find((c) => (c.photo_urls?.length ?? 0) > 0)?.photo_urls?.[0] ??
      null);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-8">
        {coverUrl ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={coverUrl}
              alt={`Portada de ${collection.name}`}
              className="aspect-[21/9] w-full object-cover"
            />
          </div>
        ) : null}
        <section className="space-y-3 text-center sm:text-left" aria-labelledby="public-collection-heading">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Library className="h-3.5 w-3.5" aria-hidden />
            Colección
          </p>
          <h1
            id="public-collection-heading"
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {collection.name}
          </h1>
          {collection.description ? (
            <p className="text-sm text-muted-foreground sm:text-base">{collection.description}</p>
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
            className="flex flex-wrap justify-center gap-2 sm:justify-start"
            role="group"
            aria-label="Acciones de la colección"
          >
            {authorHref && profile?.username ? (
              <ShareCollectionButton
                username={profile.username}
                slug={collection.slug}
                name={collection.name}
              />
            ) : null}
            {authorHref ? (
              <Button asChild variant="outline" size="sm">
                <Link to={authorHref}>Ver diario</Link>
              </Button>
            ) : null}
          </div>
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
      </div>
    </Shell>
  );
}
