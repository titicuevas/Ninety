import { useDeferredValue, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Trophy, X } from 'lucide-react';
import { CapsuleComments } from '@/components/CapsuleComments';
import { CapsuleLikeButton } from '@/components/CapsuleLikeButton';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { FilterChip } from '@/components/FilterChip';
import { FollowButton } from '@/components/FollowButton';
import { Layout } from '@/components/Layout';
import { PublicLayout } from '@/components/PublicLayout';
import { PublicWrappedSummary } from '@/components/PublicWrappedSummary';
import { ShareCapsuleButton } from '@/components/ShareCapsuleButton';
import { ShareProfileButton } from '@/components/ShareProfileButton';
import { StarRating } from '@/components/StarRating';
import { WatchContextBadge } from '@/components/WatchContextBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { formatWatchedDate } from '@/lib/format';
import { isAutoUsername } from '@/lib/profileHelpers';
import { publicProfileUrl } from '@/lib/siteUrl';
import {
  WATCH_CONTEXTS,
  WATCH_CONTEXT_LABELS,
  isWatchContext,
  type WatchContext,
} from '@/lib/watchContext';
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
  const shareTitle = `${capsule.home_team_name} vs ${capsule.away_team_name}`;

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
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/c/${capsule.id}`} className="font-medium hover:text-primary hover:underline">
                {capsule.home_team_name}
              </Link>
              <WatchContextBadge context={capsule.watch_context} />
            </div>
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
          <div className="mt-3">
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
                capsuleOwnerId={capsule.user_id}
              />
            </>
          ) : (
            <>
              <CapsuleComments capsuleId={capsule.id} commentsCount={commentsCount} />
              <p className="w-full text-sm text-muted-foreground">
                {likesCount > 0 ? `${likesCount} me gusta` : null}
                {likesCount > 0 && commentsCount > 0 ? ' · ' : null}
                {commentsCount > 0 ? `${commentsCount} comentarios` : null}
                {(likesCount > 0 || commentsCount > 0) && ' · '}
                <Link to="/login" className="text-primary hover:underline">
                  Inicia sesión para interactuar
                </Link>
              </p>
            </>
          )}
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

function parseYear(value: string | null): number | undefined {
  if (!value) return undefined;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1990 || year > 2100) return undefined;
  return year;
}

function parseRatingMin(value: string | null): number | undefined {
  if (!value) return undefined;
  const rating = Number(value);
  if (![3, 4, 5].includes(rating)) return undefined;
  return rating;
}

function parseWatchContext(value: string | null): WatchContext | undefined {
  return isWatchContext(value) ? value : undefined;
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [qDraft, setQDraft] = useState(() => searchParams.get('q') ?? '');
  const deferredQ = useDeferredValue(qDraft.trim());

  const year = parseYear(searchParams.get('year'));
  const ratingMin = parseRatingMin(searchParams.get('rating'));
  const watchContext = parseWatchContext(searchParams.get('context'));
  const q = deferredQ.length >= 2 ? deferredQ : '';

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
  } = usePublicProfile(username, { q, year, ratingMin, watchContext });

  const profile = data?.pages[0]?.profile;
  const capsules = data?.pages.flatMap((page) => page.capsules) ?? [];
  const total = data?.pages[0]?.total ?? capsules.length;
  const stats = data?.pages[0]?.stats;
  const years = data?.pages[0]?.years ?? [];
  const isOwnProfile = !!user && profile?.id === user.id;
  const Shell = user ? Layout : PublicLayout;

  const hasFilters = q.length >= 2 || year != null || ratingMin != null || watchContext != null;
  const diaryTotal = stats?.totalMatches ?? (!hasFilters ? total : 0);

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setQDraft('');
    setSearchParams({}, { replace: true });
  };

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
  const diaryEmpty = !hasFilters && diaryTotal === 0 && capsules.length === 0;
  const filterEmpty = hasFilters && capsules.length === 0;

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

            {profile.bio?.trim() ? (
              <p className="mt-3 max-w-prose text-sm text-muted-foreground sm:text-left">{profile.bio.trim()}</p>
            ) : null}

            <p className="mt-2 text-sm text-muted-foreground">
              {diaryTotal === 1 ? '1 partido en su diario' : `${diaryTotal} partidos en su diario`}
            </p>

            {profile.username ? (
              <p className="mt-1 text-sm text-muted-foreground">
                <Link
                  to={`/u/${encodeURIComponent(profile.username)}/followers`}
                  className="hover:text-foreground hover:underline"
                >
                  <span className="font-medium text-foreground">{profile.followers_count ?? 0}</span>{' '}
                  {profile.followers_count === 1 ? 'seguidor' : 'seguidores'}
                </Link>
                {' · '}
                <Link
                  to={`/u/${encodeURIComponent(profile.username)}/following`}
                  className="hover:text-foreground hover:underline"
                >
                  <span className="font-medium text-foreground">{profile.following_count ?? 0}</span>{' '}
                  siguiendo
                </Link>
              </p>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-start">
            {isOwnProfile ? (
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link to="/profile">Editar perfil</Link>
              </Button>
            ) : profile.username && user ? (
              <FollowButton
                username={profile.username}
                followedByMe={profile.followed_by_me}
                className="w-full sm:w-auto"
              />
            ) : profile.username ? (
              <Button asChild className="w-full sm:w-auto">
                <Link to="/login">Inicia sesión para seguir</Link>
              </Button>
            ) : null}
            {profile.username && !isAutoUsername(profile.username) ? (
              <ShareProfileButton
                username={profile.username}
                displayName={displayName}
                className="w-full sm:w-auto"
              />
            ) : null}
          </div>
        </section>

        {stats && stats.totalMatches > 0 ? (
          <PublicWrappedSummary name={displayName} stats={stats} />
        ) : null}

        {!diaryEmpty ? (
          <section className="space-y-3" aria-label="Filtros del diario público">
            <div className="relative">
              <Input
                value={qDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setQDraft(value);
                  const trimmed = value.trim();
                  patchParams({ q: trimmed.length >= 2 ? trimmed : null });
                }}
                placeholder="Buscar equipo, competición o nota…"
                aria-label="Buscar en el diario público"
              />
              {qDraft ? (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                  onClick={() => {
                    setQDraft('');
                    patchParams({ q: null });
                  }}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>

            {years.length > 0 ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por año">
                <FilterChip active={year == null} onClick={() => patchParams({ year: null })}>
                  Todos los años
                </FilterChip>
                {years.map((y) => (
                  <FilterChip
                    key={y}
                    active={year === y}
                    onClick={() => patchParams({ year: year === y ? null : String(y) })}
                  >
                    {y}
                  </FilterChip>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por valoración">
              <FilterChip active={ratingMin == null} onClick={() => patchParams({ rating: null })}>
                Cualquier ★
              </FilterChip>
              {[5, 4, 3].map((min) => (
                <FilterChip
                  key={min}
                  active={ratingMin === min}
                  onClick={() => patchParams({ rating: ratingMin === min ? null : String(min) })}
                >
                  {min}+ ★
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por contexto">
              <FilterChip
                active={watchContext == null}
                onClick={() => patchParams({ context: null })}
              >
                Cualquier lugar
              </FilterChip>
              {WATCH_CONTEXTS.map((value) => (
                <FilterChip
                  key={value}
                  active={watchContext === value}
                  onClick={() =>
                    patchParams({ context: watchContext === value ? null : value })
                  }
                >
                  {WATCH_CONTEXT_LABELS[value]}
                </FilterChip>
              ))}
            </div>

            {hasFilters ? (
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
                {isFetching && !isFetchingNextPage ? (
                  <span className="text-xs text-muted-foreground">Actualizando…</span>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {filterEmpty ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center sm:p-10">
              <p className="text-lg font-medium">Ningún partido con estos filtros</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Prueba otro año, valoración o limpia la búsqueda.
              </p>
              <Button type="button" variant="secondary" className="mt-4" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {capsules.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              Capsules
              {hasFilters ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {total} {total === 1 ? 'partido' : 'partidos'}
                </span>
              ) : null}
            </h2>
            {capsules.map((capsule) => (
              <PublicCapsuleCard key={capsule.id} capsule={capsule} currentUserId={user?.id} />
            ))}
            {hasNextPage ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        {diaryEmpty ? (
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
        ) : null}

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
