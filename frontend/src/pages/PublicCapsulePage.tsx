import { Link, useParams } from 'react-router-dom';
import { CapsuleComments } from '@/components/CapsuleComments';
import { CapsuleLikeButton } from '@/components/CapsuleLikeButton';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { Layout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { ShareCapsuleButton } from '@/components/ShareCapsuleButton';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuthInit';
import { usePublicCapsule } from '@/hooks/usePublicCapsule';
import { formatWatchedDate } from '@/lib/format';
import { profilePath } from '@/lib/profilePath';
import { publicCapsuleUrl } from '@/lib/siteUrl';

function formatScore(home: number | null, away: number | null) {
  if (home == null || away == null) return null;
  return `${home} – ${away}`;
}

export function PublicCapsulePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: capsule, isLoading, isError, error } = usePublicCapsule(id);
  const Shell = user ? Layout : PublicLayout;

  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

  const score = formatScore(capsule.home_score, capsule.away_score);
  const authorName = capsule.profiles?.display_name ?? capsule.profiles?.username ?? 'Aficionado';
  const username = capsule.profiles?.username;
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;
  const isOwn = !!user && capsule.user_id === user.id;

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {username ? (
              <Link to={profilePath(username)} className="text-sm font-medium text-primary hover:underline">
                {authorName}
                {isOwn ? ' (tú)' : ''}
              </Link>
            ) : (
              <p className="text-sm font-medium text-primary">{authorName}</p>
            )}
            <p className="text-xs text-muted-foreground">Visto {formatWatchedDate(capsule.watched_at)}</p>
          </div>
          <ShareCapsuleButton capsuleId={capsule.id} title={shareTitle} variant="outline" />
        </section>

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
              </div>
              {score ? <p className="shrink-0 text-lg font-semibold tabular-nums">{score}</p> : null}
            </div>

            {capsule.rating ? (
              <div className="mt-4" aria-label={`Valoración: ${capsule.rating} de 5`}>
                <StarRating rating={capsule.rating} />
              </div>
            ) : null}

            {capsule.note ? <p className="mt-4 text-sm text-muted-foreground">{capsule.note}</p> : null}

            <div className="mt-5 flex flex-wrap items-start gap-1 border-t border-border pt-3">
              {user ? (
                <>
                  <CapsuleLikeButton
                    capsuleId={capsule.id}
                    likesCount={capsule.likes_count}
                    likedByMe={capsule.liked_by_me}
                  />
                  <CapsuleComments
                    capsuleId={capsule.id}
                    commentsCount={capsule.comments_count}
                    currentUserId={user.id}
                  />
                </>
              ) : (
                <>
                  <CapsuleComments
                    capsuleId={capsule.id}
                    commentsCount={capsule.comments_count}
                  />
                  <p className="w-full pt-2 text-sm text-muted-foreground">
                    {(capsule.likes_count ?? 0) > 0 ? `${capsule.likes_count} me gusta · ` : null}
                    <Link to="/login" className="text-primary hover:underline">
                      Inicia sesión
                    </Link>{' '}
                    para dar like.
                  </p>
                </>
              )}
            </div>

            {isOwn ? (
              <div className="mt-4">
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/capsules/${capsule.id}/edit`}>Editar Capsule</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Enlace público ·{' '}
          <a href={publicCapsuleUrl(capsule.id)} className="text-primary hover:underline">
            {publicCapsuleUrl(capsule.id).replace(/^https?:\/\//, '')}
          </a>
        </p>
      </div>
    </Shell>
  );
}
