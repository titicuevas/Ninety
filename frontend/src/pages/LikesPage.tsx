import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Library, Ticket } from 'lucide-react';
import { CapsuleCardSocialFooter } from '@/components/CapsuleCardSocialFooter';
import { CapsuleListCard, capsuleCardListClass } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { CapsuleListSkeleton } from '@/components/ListSkeletons';
import { Layout } from '@/components/Layout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { useLikedCapsulesInfinite } from '@/hooks/useCapsules';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { capsuleShareSummaryFrom } from '@/lib/capsuleShare';
import { formatRelativeTime } from '@/lib/format';
import { publicProfilePath } from '@/lib/profilePath';
import type { LikedCapsule } from '@/types/capsule';

function AuthorName({ capsule, currentUserId }: { capsule: LikedCapsule; currentUserId?: string }) {
  const name = capsule.profiles?.display_name ?? capsule.profiles?.username ?? 'Aficionado';
  const isSelf = capsule.user_id === currentUserId;
  const label = isSelf ? `${name} (tú)` : name;
  const href = publicProfilePath(capsule.profiles?.username);

  if (href) {
    return (
      <Link to={href} className="text-sm font-medium text-primary hover:underline">
        {label}
      </Link>
    );
  }

  return <p className="text-sm font-medium text-primary">{label}</p>;
}

function LikedCapsuleCard({
  capsule,
  currentUserId,
}: {
  capsule: LikedCapsule;
  currentUserId?: string;
}) {
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;

  return (
    <CapsuleListCard
      capsule={capsule}
      competitionTone="muted"
      photoClassName="mb-3"
      footerBordered
      header={
        <div className="mb-3 flex items-center justify-between gap-2">
          <AuthorName capsule={capsule} currentUserId={currentUserId} />
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={capsule.liked_at}>
            {formatRelativeTime(capsule.liked_at)}
          </time>
        </div>
      }
      footer={
        <CapsuleCardSocialFooter
          capsuleId={capsule.id}
          capsuleOwnerId={capsule.user_id}
          currentUserId={currentUserId}
          likesCount={capsule.likes_count}
          likedByMe={capsule.liked_by_me}
          commentsCount={capsule.comments_count}
          alsoWatched={capsule.also_watched}
          shareTitle={shareTitle}
          share={capsuleShareSummaryFrom(capsule, capsule.profiles)}
          isPublic={capsule.is_public !== false}
        />
      }
    />
  );
}

export function LikesPage() {
  useDocumentTitle('Me gusta');
  const { user } = useAuth();
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useLikedCapsulesInfinite();

  const capsules = useMemo(
    () => data?.pages.flatMap((page) => page.capsules ?? []) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? capsules.length;
  const empty = !isLoading && !isError && total === 0;

  return (
    <Layout>
      <div className="space-y-5 sm:space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Me gusta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Capsules que te gustaron
              {!isLoading && total > 0
                ? ` · ${total} ${total === 1 ? 'partido' : 'partidos'}`
                : '.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="secondary" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to="/capsules">
                <Ticket className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1.5">Mis Capsules</span>
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to="/collections/likes">
                <Library className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1.5">Listas</span>
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to="/diary/calendar">
                <CalendarDays className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1.5">Calendario</span>
              </Link>
            </Button>
          </div>
        </section>

        {isLoading ? <CapsuleListSkeleton withAuthor count={3} /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudieron cargar tus me gusta'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {empty ? (
          <EmptyState
            title="Aún no has dado me gusta"
            description="Cuando te guste una Capsule del feed o de un diario, aparecerá aquí."
          >
            <Button asChild>
              <Link to="/feed">Ir al feed</Link>
            </Button>
          </EmptyState>
        ) : null}

        {!isLoading && !isError && capsules.length > 0 ? (
          <div className="space-y-4">
            <ul className={capsuleCardListClass}>
              {capsules.map((capsule) => (
                <li key={capsule.id}>
                  <LikedCapsuleCard capsule={capsule} currentUserId={user?.id} />
                </li>
              ))}
            </ul>
            <InfiniteScrollSentinel
              hasNextPage={Boolean(hasNextPage)}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </div>
        ) : null}

        {!isLoading && !isError && capsules.length === 0 && total > 0 ? (
          <InfiniteScrollSentinel
            hasNextPage={Boolean(hasNextPage)}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        ) : null}
      </div>
    </Layout>
  );
}
