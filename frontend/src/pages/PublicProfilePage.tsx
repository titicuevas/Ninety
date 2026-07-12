import { Link, useParams } from 'react-router-dom';
import { MapPin, Trophy } from 'lucide-react';
import { CapsuleComments } from '@/components/CapsuleComments';
import { CapsuleLikeButton } from '@/components/CapsuleLikeButton';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { FollowButton } from '@/components/FollowButton';
import { Layout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { formatWatchedDate } from '@/lib/format';
import { publicProfileUrl } from '@/lib/siteUrl';
import type { Capsule } from '@/types/capsule';

function formatScore(capsule: Capsule) {
  if (capsule.home_score == null || capsule.away_score == null) return null;
  return `${capsule.home_score} – ${capsule.away_score}`;
}

function PublicCapsuleCard({
  capsule,
  currentUserId,
}: {
  capsule: Capsule & { likes_count?: number; liked_by_me?: boolean; comments_count?: number };
  currentUserId?: string;
}) {
  const score = formatScore(capsule);
  const likesCount = capsule.likes_count ?? 0;
  const commentsCount = capsule.comments_count ?? 0;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <CapsulePhotoGallery
          capsule={capsule}
          alt={`Foto del partido ${capsule.home_team_name} vs ${capsule.away_team_name}`}
          className="mb-4"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{capsule.home_team_name}</p>
            <p className="text-muted-foreground">{capsule.away_team_name}</p>
            {capsule.competition_name ? (
              <p className="mt-1 text-xs text-primary">{capsule.competition_name}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            {score ? <p className="font-semibold tabular-nums">{score}</p> : null}
            <p className="mt-0.5 text-xs text-muted-foreground">Visto {formatWatchedDate(capsule.watched_at)}</p>
          </div>
        </div>

        {capsule.rating ? (
          <div className="mt-3" aria-label={`Valoración: ${capsule.rating} de 5`}>
            <StarRating rating={capsule.rating} />
          </div>
        ) : null}

        {capsule.note ? <p className="mt-3 text-sm text-muted-foreground">{capsule.note}</p> : null}

        <div className="mt-4 flex flex-wrap items-start gap-1 border-t border-border pt-3">
          {currentUserId ? (
            <>
              <CapsuleLikeButton
                capsuleId={capsule.id}
                likesCount={likesCount}
                likedByMe={capsule.liked_by_me}
              />
              <CapsuleComments
                capsuleId={capsule.id}
                commentsCount={commentsCount}
                currentUserId={currentUserId}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {likesCount > 0 ? `${likesCount} me gusta` : null}
              {likesCount > 0 && commentsCount > 0 ? ' · ' : null}
              {commentsCount > 0 ? `${commentsCount} comentarios` : null}
              {(likesCount > 0 || commentsCount > 0) && ' · '}
              <Link to="/login" className="text-primary hover:underline">
                Inicia sesión para interactuar
              </Link>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = usePublicProfile(username);
  const profile = data?.profile;
  const capsules = data?.capsules ?? [];
  const isOwnProfile = !!user && profile?.id === user.id;
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

  if (isError || !profile) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Usuario no encontrado</h1>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'No existe ese perfil público.'}
          </p>
          <Button asChild variant="secondary">
            <Link to={user ? '/feed' : '/'}>{user ? 'Volver al feed' : 'Volver al inicio'}</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const displayName = profile.display_name ?? profile.username ?? 'Aficionado';
  const location = [profile.city, profile.country].filter(Boolean).join(', ');

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            {profile.username ? <p className="text-muted-foreground">@{profile.username}</p> : null}

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
              {profile.favorite_team ? (
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                  {profile.favorite_team}
                </span>
              ) : null}
              {location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {location}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              {capsules.length === 1 ? '1 partido en su diario' : `${capsules.length} partidos en su diario`}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{profile.followers_count ?? 0}</span>{' '}
              {profile.followers_count === 1 ? 'seguidor' : 'seguidores'}
              {' · '}
              <span className="font-medium text-foreground">{profile.following_count ?? 0}</span> siguiendo
            </p>
          </div>

          {isOwnProfile ? (
            <Button asChild variant="secondary" className="shrink-0">
              <Link to="/profile">Editar perfil</Link>
            </Button>
          ) : profile.username && user ? (
            <FollowButton username={profile.username} followedByMe={profile.followed_by_me} />
          ) : profile.username ? (
            <Button asChild className="shrink-0">
              <Link to="/login">Inicia sesión para seguir</Link>
            </Button>
          ) : null}
        </section>

        {capsules.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Capsules</h2>
            {capsules.map((capsule) => (
              <PublicCapsuleCard key={capsule.id} capsule={capsule} currentUserId={user?.id} />
            ))}
          </section>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {isOwnProfile ? (
                <>
                  Aún no has guardado partidos.{' '}
                  <Link to="/search" className="text-primary hover:underline">
                    Busca un partido
                  </Link>{' '}
                  para empezar.
                </>
              ) : (
                'Este aficionado aún no ha publicado partidos en su diario.'
              )}
            </CardContent>
          </Card>
        )}

        {profile.username ? (
          <p className="text-center text-xs text-muted-foreground">
            Perfil público ·{' '}
            <a href={publicProfileUrl(profile.username)} className="text-primary hover:underline">
              {publicProfileUrl(profile.username).replace(/^https?:\/\//, '')}
            </a>
          </p>
        ) : null}
      </div>
    </Shell>
  );
}
