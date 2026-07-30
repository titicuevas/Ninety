import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CapsuleComments } from '@/components/CapsuleComments';
import { CapsuleLikeButton } from '@/components/CapsuleLikeButton';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { Layout } from '@/components/Layout';
import { PeopleResultRow } from '@/components/PeopleSearchPanel';
import { ShareCapsuleButton } from '@/components/ShareCapsuleButton';
import { StarRating } from '@/components/StarRating';
import { WatchContextBadge } from '@/components/WatchContextBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsuleFeed } from '@/hooks/useCapsules';
import { useDiscoverProfiles } from '@/hooks/useDiscoverProfiles';
import { useAuth } from '@/hooks/useAuthInit';
import { formatRelativeTime } from '@/lib/format';
import { profilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';
import type { FeedCapsule } from '@/types/capsule';

type FeedSort = 'recent' | 'popular';

function formatScore(capsule: FeedCapsule) {
  if (capsule.home_score == null || capsule.away_score == null) return null;
  return `${capsule.home_score} – ${capsule.away_score}`;
}

function AuthorName({ capsule, currentUserId }: { capsule: FeedCapsule; currentUserId?: string }) {
  const name = capsule.profiles?.display_name ?? capsule.profiles?.username ?? 'Aficionado';
  const isSelf = capsule.user_id === currentUserId;
  const label = isSelf ? `${name} (tú)` : name;
  const username = capsule.profiles?.username;

  if (username) {
    return (
      <Link to={profilePath(username)} className="text-sm font-medium text-primary hover:underline">
        {label}
      </Link>
    );
  }

  return <p className="text-sm font-medium text-primary">{label}</p>;
}

function FeedCapsuleCard({ capsule, currentUserId }: { capsule: FeedCapsule; currentUserId?: string }) {
  const score = formatScore(capsule);
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <AuthorName capsule={capsule} currentUserId={currentUserId} />
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={capsule.created_at}>
            {formatRelativeTime(capsule.created_at)}
          </time>
        </div>

        <CapsulePhotoGallery
          capsule={capsule}
          alt={`Foto del partido ${capsule.home_team_name} vs ${capsule.away_team_name}`}
          className="mb-3"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/c/${capsule.id}`} className="font-medium hover:text-primary hover:underline">
                {capsule.home_team_name}
              </Link>
              <WatchContextBadge context={capsule.watch_context} />
            </div>
            <p className="text-muted-foreground">{capsule.away_team_name}</p>
            {capsule.competition_name ? (
              <p className="mt-1 text-xs text-muted-foreground">{capsule.competition_name}</p>
            ) : null}
          </div>
          {score ? <p className="shrink-0 font-semibold tabular-nums">{score}</p> : null}
        </div>

        {capsule.rating ? (
          <div className="mt-3">
            <StarRating rating={capsule.rating} />
          </div>
        ) : null}

        {capsule.note ? <p className="mt-3 text-sm text-muted-foreground">{capsule.note}</p> : null}

        <div className="mt-4 flex flex-wrap items-start gap-1 border-t border-border pt-3">
          <CapsuleLikeButton
            capsuleId={capsule.id}
            likesCount={capsule.likes_count}
            likedByMe={capsule.liked_by_me}
          />
          <CapsuleComments
            capsuleId={capsule.id}
            commentsCount={capsule.comments_count}
            currentUserId={currentUserId}
            capsuleOwnerId={capsule.user_id}
          />
          <ShareCapsuleButton
            capsuleId={capsule.id}
            title={shareTitle}
            isPublic={capsule.is_public !== false}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function sortCapsules(capsules: FeedCapsule[], sort: FeedSort): FeedCapsule[] {
  if (sort === 'recent') return capsules;
  return [...capsules].sort((a, b) => {
    const scoreA = (a.likes_count ?? 0) + (a.comments_count ?? 0);
    const scoreB = (b.likes_count ?? 0) + (b.comments_count ?? 0);
    return scoreB - scoreA || b.created_at.localeCompare(a.created_at);
  });
}

export function FeedPage() {
  const { user } = useAuth();
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCapsuleFeed();
  const [sort, setSort] = useState<FeedSort>('recent');
  const rawCapsules = useMemo(
    () => data?.pages.flatMap((page) => page.capsules) ?? [],
    [data],
  );
  const capsules = useMemo(
    () => sortCapsules(rawCapsules, sort),
    [rawCapsules, sort],
  );
  const followingCount = data?.pages[0]?.following_count;
  const isEmpty = !isLoading && !isError && capsules.length === 0;
  const { data: discoverData } = useDiscoverProfiles(isEmpty);
  const suggestions = discoverData?.profiles ?? [];

  return (
    <Layout>
      <div className="space-y-8">
        <section className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Feed</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              El vestuario digital: partidos de a quien sigues y los tuyos.
            </p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Orden del feed">
            {([['recent', 'Recientes'], ['popular', 'Populares']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={sort === key}
                onClick={() => setSort(key)}
                className={cn(
                  'min-h-9 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  sort === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : null}

        {isError ? (
          <Card className="border-destructive/40">
            <CardContent className="p-5 text-sm text-destructive">
              {error instanceof Error ? error.message : 'No se pudo cargar el feed'}
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !isError && capsules.length === 0 ? (
          <div className="space-y-6">
            <Card className="border-dashed">
              <CardContent className="p-6 text-center sm:p-10">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
                <p className="text-lg font-medium">Tu feed está vacío</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {followingCount === 0
                    ? 'Sigue a otros aficionados para ver sus partidos aquí.'
                    : 'La gente que sigues aún no ha publicado partidos, o aún no has guardado ninguno.'}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/search?tab=people">Buscar aficionados</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to="/search">Buscar partido</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {suggestions.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
                  Aficionados sugeridos
                </h2>
                <ul className="space-y-2">
                  {suggestions.map((profile) => (
                    <PeopleResultRow key={profile.id} profile={profile} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {!isLoading && !isError && capsules.length > 0 ? (
          <div className="space-y-4">
            <ul className="space-y-3">
              {capsules.map((capsule) => (
                <li key={capsule.id}>
                  <FeedCapsuleCard capsule={capsule} currentUserId={user?.id} />
                </li>
              ))}
            </ul>
            {hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  loading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  Cargar más
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
