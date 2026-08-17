import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AddToCollectionButton } from '@/components/AddToCollectionButton';
import { CapsuleAlsoCommented } from '@/components/CapsuleAlsoCommented';
import { CapsuleAlsoLiked } from '@/components/CapsuleAlsoLiked';
import { CapsuleAlsoWatched } from '@/components/CapsuleAlsoWatched';
import { CapsuleEngagementBar } from '@/components/CapsuleEngagementBar';
import { CapsuleNoteText } from '@/components/CapsuleNoteText';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { CapsuleTagsList } from '@/components/CapsuleTags';
import { FollowButton } from '@/components/FollowButton';
import { FollowsYouBadge } from '@/components/FollowsYouBadge';
import { FormSuccess } from '@/components/FormAlert';
import { Layout } from '@/components/Layout';
import { CapsuleListSkeleton } from '@/components/ListSkeletons';
import { PublicLayout } from '@/components/PublicLayout';
import { PushActivationBanner } from '@/components/PushActivationBanner';
import { ReportContentButton } from '@/components/ReportContentButton';
import { ShareCapsuleButton } from '@/components/ShareCapsuleButton';
import { StarRating } from '@/components/StarRating';
import { WatchContextBadge } from '@/components/WatchContextBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuthInit';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePublicCapsule } from '@/hooks/usePublicCapsule';
import { capsuleShareSummaryFrom } from '@/lib/capsuleShare';
import { formatCapsuleScore, formatWatchedDate } from '@/lib/format';
import { isAutoUsername } from '@/lib/profileHelpers';
import { profilePath } from '@/lib/profilePath';

type CapsuleLocationState = {
  shareNudge?: boolean;
  savedChanges?: boolean;
  privateSaved?: boolean;
};

export function PublicCapsulePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { loginTo } = useAuthReturnLinks();
  const { data: capsule, isLoading, isError, error } = usePublicCapsule(id);
  useDocumentTitle(
    capsule
      ? `${capsule.home_team_name} vs ${capsule.away_team_name}`
      : isLoading
        ? 'Capsule'
        : 'Capsule no encontrada',
  );
  const Shell = user ? Layout : PublicLayout;
  const openComments = location.hash === '#comments';
  const locationState = location.state as CapsuleLocationState | null;
  const [showShareNudge, setShowShareNudge] = useState(() => Boolean(locationState?.shareNudge));
  const [showSavedBanner, setShowSavedBanner] = useState(() => Boolean(locationState?.savedChanges));
  const [showPrivateSaved, setShowPrivateSaved] = useState(() =>
    Boolean(locationState?.privateSaved),
  );

  if (isLoading) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg">
          <CapsuleListSkeleton withAuthor count={1} />
        </div>
      </Shell>
    );
  }

  if (isError || !capsule) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Capsule no encontrada</h1>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Este partido no existe o ya no está disponible.'}
          </p>
          <Button asChild variant="secondary">
            <Link to={user ? '/feed' : '/'}>{user ? 'Volver al feed' : 'Volver al inicio'}</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const score = formatCapsuleScore(capsule.home_score, capsule.away_score);
  const authorName = capsule.profiles?.display_name ?? capsule.profiles?.username ?? 'Aficionado';
  const username = capsule.profiles?.username;
  const avatarUrl = capsule.profiles?.avatar_url;
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;
  const shareSummary = capsuleShareSummaryFrom(capsule, capsule.profiles);
  const isOwn = !!user && capsule.user_id === user.id;
  const canFollow = !!username && !isAutoUsername(username) && !isOwn;

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {username && !isAutoUsername(username) ? (
              <Link to={profilePath(username)} className="shrink-0" aria-label={`Perfil de ${authorName}`}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-11 w-11 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {authorName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </Link>
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {authorName.slice(0, 1).toUpperCase()}
              </span>
            )}

            <div className="min-w-0">
              {username && !isAutoUsername(username) ? (
                <Link to={profilePath(username)} className="text-sm font-medium text-primary hover:underline">
                  {authorName}
                  {isOwn ? ' (tú)' : ''}
                </Link>
              ) : (
                <p className="text-sm font-medium text-primary">
                  {authorName}
                  {isOwn ? ' (tú)' : ''}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Visto {formatWatchedDate(capsule.watched_at)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canFollow && user && username ? (
              <FollowButton
                username={username}
                followedByMe={capsule.profiles?.followed_by_me}
                followsMe={capsule.profiles?.follows_me}
                size="compact"
              />
            ) : null}
            {canFollow && user && capsule.profiles?.follows_me ? <FollowsYouBadge /> : null}
            {canFollow && !user ? (
              <Button asChild size="sm" variant="secondary">
                <Link to={loginTo}>Inicia sesión para seguir</Link>
              </Button>
            ) : null}
            {user && !isOwn ? (
              <ReportContentButton
                targetType="capsule"
                targetId={capsule.id}
                size="icon"
              />
            ) : null}
            <ShareCapsuleButton
              capsuleId={capsule.id}
              title={shareTitle}
              share={shareSummary}
              variant="outline"
              isPublic={capsule.is_public !== false}
              compact
            />
          </div>
        </section>

        {showSavedBanner && isOwn ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FormSuccess className="flex-1">Cambios guardados</FormSuccess>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowSavedBanner(false)}>
              Cerrar
            </Button>
          </div>
        ) : null}

        {showShareNudge && isOwn && capsule.is_public !== false ? (
          <Card className="border-primary/40 bg-primary/5 motion-reveal">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">Comparte este partido</p>
              <div className="flex flex-wrap items-center gap-2">
                <ShareCapsuleButton
                  capsuleId={capsule.id}
                  title={shareTitle}
                  share={shareSummary}
                  variant="secondary"
                  isPublic
                  compact
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowShareNudge(false)}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {showPrivateSaved && isOwn && capsule.is_public === false ? (
          <Card
            className="border-primary/40 bg-primary/5 motion-reveal"
            data-testid="private-capsule-saved-banner"
          >
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">Guardada en privado</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/capsules/${capsule.id}/edit`}>Hazla pública</Link>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPrivateSaved(false)}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isOwn && capsule.is_public !== false ? <PushActivationBanner context="post_create" /> : null}

        <Card>
          <CardContent className="p-4 sm:p-5">
            <CapsulePhotoGallery
              capsule={capsule}
              alt={`Foto del partido ${capsule.home_team_name} vs ${capsule.away_team_name}`}
              className="mb-4"
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {capsule.home_team_name}
                  <span className="mx-2 text-muted-foreground">vs</span>
                  {capsule.away_team_name}
                </h1>
                {capsule.competition_name ? (
                  <p className="mt-1 text-sm text-primary">{capsule.competition_name}</p>
                ) : null}
                <div className="mt-2">
                  <WatchContextBadge context={capsule.watch_context} />
                </div>
              </div>
              {score ? <p className="shrink-0 text-lg font-semibold tabular-nums">{score}</p> : null}
            </div>

            {capsule.rating ? (
              <div className="mt-4">
                <StarRating rating={capsule.rating} />
              </div>
            ) : null}

            {capsule.note ? <CapsuleNoteText note={capsule.note} /> : null}

            <CapsuleTagsList tags={capsule.tags} />

            {user ? (
              <CapsuleAlsoWatched
                className="mt-4"
                matchId={capsule.match_id}
                exceptUserId={capsule.user_id}
              />
            ) : null}

            {user ? (
              <CapsuleAlsoLiked
                className="mt-2"
                capsuleId={capsule.id}
                exceptUserId={capsule.user_id}
              />
            ) : null}

            {user ? (
              <CapsuleAlsoCommented
                className="mt-2"
                capsuleId={capsule.id}
                exceptUserId={capsule.user_id}
              />
            ) : null}

            <CapsuleEngagementBar
              className="mt-5"
              capsuleId={capsule.id}
              shareTitle={shareTitle}
              share={shareSummary}
              likesCount={capsule.likes_count}
              likedByMe={capsule.liked_by_me}
              commentsCount={capsule.comments_count}
              currentUserId={user?.id}
              capsuleOwnerId={capsule.user_id}
              isPublic={capsule.is_public !== false}
              defaultOpenComments={openComments}
              showShare={false}
            />

            {isOwn ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <AddToCollectionButton capsuleId={capsule.id} variant="secondary" compact />
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/capsules/${capsule.id}/edit`}>Editar Capsule</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {isOwn && capsule.is_public === false ? (
          <p className="text-center text-xs text-muted-foreground">
            Solo tú puedes ver esta Capsule ·{' '}
            <Link to={`/capsules/${capsule.id}/edit`} className="text-primary hover:underline">
              Hazla pública
            </Link>
          </p>
        ) : null}
      </div>
    </Shell>
  );
}
