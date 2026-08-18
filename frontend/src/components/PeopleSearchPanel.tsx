import { Link } from 'react-router-dom';
import { Search, Swords, Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { FollowButton } from '@/components/FollowButton';
import { FollowsYouBadge } from '@/components/FollowsYouBadge';
import { PeopleListSkeleton } from '@/components/ListSkeletons';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDiscoverProfiles } from '@/hooks/useDiscoverProfiles';
import { usePeopleSearchFilterParams } from '@/hooks/usePeopleSearchFilterParams';
import { MIN_PEOPLE_QUERY, useProfileSearch } from '@/hooks/useProfileSearch';
import { useProfile } from '@/hooks/useProfile';
import { DISCOVER_REASON_CHIPS, discoverProfileMatchLabel } from '@/lib/discoverProfiles';
import { isAutoUsername } from '@/lib/profileHelpers';
import { profilePath } from '@/lib/profilePath';
import { teamPathFromFavorite } from '@/lib/teamPath';
import type { Profile } from '@/types/profile';

export function PeopleResultRow({ profile }: { profile: Profile }) {
  const username = profile.username!;
  const name = profile.display_name ?? username;
  const location = [profile.city, profile.country].filter(Boolean).join(', ');
  const canLink = !isAutoUsername(username);
  const href = canLink ? profilePath(username) : null;
  const canCompare = canLink;
  const matchLabel = discoverProfileMatchLabel(profile.match_reason);
  const teamHref = teamPathFromFavorite(profile.favorite_team);

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <Link to={href} className="font-medium text-foreground hover:text-primary hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{name}</span>
          )}
          {matchLabel ? (
            <span
              className={
                profile.match_reason === 'favorite_team'
                  ? 'rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary'
                  : 'rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'
              }
            >
              {matchLabel}
            </span>
          ) : null}
          {profile.follows_me ? <FollowsYouBadge /> : null}
        </div>
        {canLink ? <p className="text-sm text-muted-foreground">@{username}</p> : null}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {teamHref && profile.favorite_team ? (
            <>
              <Link to={teamHref} className="hover:text-foreground hover:underline">
                {profile.favorite_team}
              </Link>
              {location ? ` · ${location}` : null}
            </>
          ) : (
            [profile.favorite_team, location].filter(Boolean).join(' · ') || 'Aficionado Ninety'
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {canCompare ? (
          <Button asChild variant="ghost" size="sm" className="px-2 text-muted-foreground">
            <Link
              to={`/u/${encodeURIComponent(username)}/vs`}
              aria-label={`Cara a cara con @${username}`}
            >
              <Swords className="h-4 w-4" aria-hidden />
              <span className="ml-1.5 hidden sm:inline">vs</span>
            </Link>
          </Button>
        ) : null}
        {canLink ? (
          <FollowButton
            username={username}
            followedByMe={!!profile.followed_by_me}
            followsMe={!!profile.follows_me}
            size="compact"
          />
        ) : null}
      </div>
    </li>
  );
}

export function PeopleSearchPanel() {
  const { q, qDraft, setQDraft, reason, setReason, clearFilters } = usePeopleSearchFilterParams();
  const showSuggestions = !qDraft.trim();
  const { data: me } = useProfile();
  const myTeamHref = teamPathFromFavorite(me?.favorite_team);

  const { data, isLoading, isFetching, isError, error, refetch, isRefetching } =
    useProfileSearch(q);
  const { data: discoverData, isLoading: discoverLoading } = useDiscoverProfiles(showSuggestions, {
    limit: 24,
    reason,
  });
  const profiles = data?.profiles ?? [];
  const suggestions = discoverData?.profiles ?? [];
  const searching = q.length >= MIN_PEOPLE_QUERY && (isLoading || isFetching);

  return (
    <div className="space-y-6">
      <div className="max-w-xl space-y-1.5">
        <Label htmlFor="people-search">Nombre o username</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="people-search"
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Ej. beta_ninety, Beta…"
            className="pl-9"
            autoFocus
            autoComplete="off"
          />
        </div>
        {qDraft.trim().length > 0 && qDraft.trim().length < MIN_PEOPLE_QUERY ? (
          <p className="text-sm text-muted-foreground">Escribe al menos {MIN_PEOPLE_QUERY} caracteres.</p>
        ) : null}
        {myTeamHref && me?.favorite_team?.trim() ? (
          <p className="text-sm text-muted-foreground">
            O explora{' '}
            <Link to={myTeamHref} className="text-primary hover:underline">
              fans de {me.favorite_team.trim()}
            </Link>
            .
          </p>
        ) : null}
      </div>

      {showSuggestions ? (
        <div className="max-w-xl space-y-2">
          <div
            className={filterChipRowClass}
            role="group"
            aria-label="Filtrar sugerencias"
            data-testid="people-discover-filters"
          >
            {DISCOVER_REASON_CHIPS.map((chip) => (
              <FilterChip
                key={chip.value ?? 'all'}
                active={reason === chip.value}
                onClick={() => setReason(chip.value)}
              >
                {chip.label}
              </FilterChip>
            ))}
          </div>
          {reason ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
              Quitar filtro
            </Button>
          ) : null}
        </div>
      ) : null}

      {searching ? (
        <PeopleListSkeleton count={3} className="max-w-xl" label="Buscando aficionados" />
      ) : null}

      {isError ? (
        <QueryErrorCard
          className="max-w-xl"
          message={error instanceof Error ? error.message : 'No se pudo buscar usuarios'}
          loading={isRefetching}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!searching && q.length >= MIN_PEOPLE_QUERY && !isError ? (
        profiles.length > 0 ? (
          <ul className="max-w-xl space-y-2">
            {profiles.map((profile) => (
              <PeopleResultRow
                key={`${profile.id}:${profile.followed_by_me ? '1' : '0'}:${profile.follows_me ? '1' : '0'}`}
                profile={profile}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Users}
            className="max-w-xl"
            title="Sin resultados"
            description={`No hay aficionados para «${q}». Prueba otro username o nombre.`}
          />
        )
      ) : null}

      {showSuggestions ? (
        discoverLoading ? (
          <PeopleListSkeleton count={4} className="max-w-xl" label="Cargando sugerencias" />
        ) : suggestions.length > 0 ? (
          <section className="max-w-xl space-y-3" aria-label="Aficionados sugeridos">
            <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
              Aficionados sugeridos
            </h2>
            <ul className="space-y-2">
              {suggestions.map((profile) => (
                <PeopleResultRow key={profile.id} profile={profile} />
              ))}
            </ul>
          </section>
        ) : (
          <EmptyState
            icon={Users}
            className="max-w-xl"
            title={reason ? 'Sin sugerencias' : 'Encuentra aficionados'}
            description={
              reason
                ? 'Prueba otro filtro o quítalo.'
                : 'Busca por username o nombre.'
            }
          >
            {reason ? (
              <Button type="button" variant="secondary" onClick={clearFilters}>
                Quitar filtro
              </Button>
            ) : null}
          </EmptyState>
        )
      ) : null}
    </div>
  );
}
