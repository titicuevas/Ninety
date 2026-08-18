import { Link, useParams } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { capsuleCardListClass } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { NinetyLoader } from '@/components/NinetyLoader';
import { PublicLayout } from '@/components/PublicLayout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { WantToGoButton } from '@/components/WantToGoButton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePublicWantToGo } from '@/hooks/useWantToGo';
import { publicProfilePath } from '@/lib/profilePath';
import { isPublicProfileNotFound } from '@/lib/publicProfileError';
import { wantToGoToFootballMatch } from '@/lib/wantToGo';

export function PublicWantToGoPage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = usePublicWantToGo(
    username,
    50,
  );
  const profile = data?.profile;
  const displayName = profile?.display_name ?? profile?.username ?? username ?? 'Aficionado';
  const authorHref = publicProfilePath(profile?.username ?? username);
  const Shell = user ? Layout : PublicLayout;

  useDocumentTitle(username ? `Quiero ir · @${username}` : 'Quiero ir');

  if (isLoading) {
    return (
      <Shell>
        <NinetyLoader variant="panel" label="Cargando Quiero ir…" />
      </Shell>
    );
  }

  if (isError || !data) {
    const notFound = isPublicProfileNotFound(error);
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          {notFound ? (
            <>
              <h1 className="text-xl font-semibold">Lista no disponible</h1>
              <p className="text-sm text-muted-foreground">
                Este perfil no existe o no puedes ver su Quiero ir.
              </p>
            </>
          ) : (
            <QueryErrorCard
              message={error instanceof Error ? error.message : 'No se pudo cargar Quiero ir'}
              loading={isRefetching}
              onRetry={() => void refetch()}
            />
          )}
          <Button asChild variant="secondary">
            <Link to={authorHref ?? (user ? '/home' : '/')}>Volver</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const items = data.items;

  return (
    <Shell>
      <div className="space-y-5 sm:space-y-8">
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {authorHref ? (
              <Link to={authorHref} className="hover:text-foreground hover:underline">
                {displayName}
              </Link>
            ) : (
              displayName
            )}
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Bookmark className="h-7 w-7 text-primary" aria-hidden />
            Quiero ir
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.total === 1
              ? '1 partido próximo'
              : `${data.total} partidos próximos`}
          </p>
        </section>

        {items.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Sin próximos partidos"
            description="Cuando marque partidos en Quiero ir, aparecerán aquí."
          >
            {authorHref ? (
              <Button asChild variant="secondary">
                <Link to={authorHref}>Ver perfil</Link>
              </Button>
            ) : null}
          </EmptyState>
        ) : (
          <ul className={capsuleCardListClass}>
            {items.map((item) => {
              const match = wantToGoToFootballMatch(item);
              return (
                <li key={item.match_id} className="space-y-2">
                  <MatchCard match={match} wantToGo />
                  {user ? <WantToGoButton match={match} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Shell>
  );
}
