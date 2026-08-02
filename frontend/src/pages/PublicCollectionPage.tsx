import { Link, useParams } from 'react-router-dom';
import { Library } from 'lucide-react';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ShareCollectionButton } from '@/components/ShareCollectionButton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { usePublicCollection } from '@/hooks/useCollections';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { profilePath } from '@/lib/profilePath';

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

  useDocumentTitle(
    collection?.name ? `${collection.name} · ${displayName}` : 'Colección',
  );

  const Shell = user ? Layout : PublicLayout;

  if (isLoading) {
    return (
      <Shell>
        <p className="mx-auto max-w-lg py-16 text-center text-sm text-muted-foreground">
          Cargando colección…
        </p>
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
            <Link to={username ? profilePath(username) : user ? '/home' : '/'}>
              {username ? 'Ver perfil' : 'Volver'}
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const capsules = data?.capsules ?? [];

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="space-y-3 text-center sm:text-left">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Library className="h-3.5 w-3.5" aria-hidden />
            Colección
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{collection.name}</h1>
          {collection.description ? (
            <p className="text-sm text-muted-foreground sm:text-base">{collection.description}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Por{' '}
            {profile?.username ? (
              <Link
                to={profilePath(profile.username)}
                className="font-medium text-foreground hover:underline"
              >
                {displayName}
              </Link>
            ) : (
              displayName
            )}
            {' · '}
            {capsules.length} {capsules.length === 1 ? 'partido' : 'partidos'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {profile?.username ? (
              <ShareCollectionButton
                username={profile.username}
                slug={collection.slug}
                name={collection.name}
              />
            ) : null}
            {profile?.username ? (
              <Button asChild variant="outline" size="sm">
                <Link to={profilePath(profile.username)}>Ver diario</Link>
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
          <ul className="space-y-3">
            {capsules.map((capsule) => (
              <li key={capsule.id}>
                <CapsuleListCard capsule={capsule} showWatchedDate />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
