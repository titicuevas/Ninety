import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserMinus, UserPlus, Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PeopleListSkeleton } from '@/components/ListSkeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDiscoverProfiles } from '@/hooks/useDiscoverProfiles';
import { useToggleFollow } from '@/hooks/useFollowUser';
import { MIN_PEOPLE_QUERY, useProfileSearch } from '@/hooks/useProfileSearch';
import { profilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/profile';

export function PeopleResultRow({ profile }: { profile: Profile }) {
  const username = profile.username!;
  const [followed, setFollowed] = useState(() => !!profile.followed_by_me);
  const toggle = useToggleFollow(username);
  const name = profile.display_name ?? username;
  const location = [profile.city, profile.country].filter(Boolean).join(', ');

  useEffect(() => {
    setFollowed(!!profile.followed_by_me);
  }, [profile.followed_by_me, profile.id]);

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
          <Link to={profilePath(username)} className="font-medium text-foreground hover:text-primary hover:underline">
            {name}
          </Link>
          {profile.match_reason === 'favorite_team' ? (
            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Mismo equipo
            </span>
          ) : profile.match_reason === 'city' ? (
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cerca
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">@{username}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[profile.favorite_team, location].filter(Boolean).join(' · ') || 'Aficionado Ninety'}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={toggle.isPending}
          aria-pressed={followed}
          aria-label={followed ? 'Dejar de seguir' : 'Seguir'}
          onClick={() =>
            toggle.mutate(
              { followed },
              {
                onSuccess: () => setFollowed((v) => !v),
              },
            )
          }
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            followed
              ? 'bg-secondary text-foreground hover:bg-secondary/80'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {followed ? (
            <>
              <UserMinus className="h-4 w-4" aria-hidden />
              Siguiendo
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" aria-hidden />
              Seguir
            </>
          )}
        </button>
        {toggle.isError ? (
          <p className="max-w-[10rem] text-right text-xs text-destructive">
            {toggle.error instanceof Error ? toggle.error.message : 'Error'}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function PeopleSearchPanel({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(() => initialQuery.trim());
  const showSuggestions = !query.trim();

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const { data, isLoading, isFetching, isError, error } = useProfileSearch(debounced);
  const { data: discoverData, isLoading: discoverLoading } = useDiscoverProfiles(showSuggestions);
  const profiles = data?.profiles ?? [];
  const suggestions = discoverData?.profiles ?? [];
  const searching = debounced.length >= MIN_PEOPLE_QUERY && (isLoading || isFetching);

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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej. beta_ninety, Beta…"
            className="pl-9"
            autoFocus
          />
        </div>
        {query.trim().length > 0 && query.trim().length < MIN_PEOPLE_QUERY ? (
          <p className="text-sm text-muted-foreground">Escribe al menos {MIN_PEOPLE_QUERY} caracteres.</p>
        ) : null}
      </div>

      {searching ? (
        <PeopleListSkeleton count={3} className="max-w-xl" label="Buscando aficionados" />
      ) : null}

      {isError ? (
        <Card className="border-destructive/40">
          <CardContent className="p-5 text-sm text-destructive">
            {error instanceof Error ? error.message : 'No se pudo buscar usuarios'}
          </CardContent>
        </Card>
      ) : null}

      {!searching && debounced.length >= MIN_PEOPLE_QUERY && !isError ? (
        profiles.length > 0 ? (
          <ul className="max-w-xl space-y-2">
            {profiles.map((profile) => (
              <PeopleResultRow
                key={`${profile.id}:${profile.followed_by_me ? '1' : '0'}`}
                profile={profile}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Users}
            className="max-w-xl"
            title="Sin resultados"
            description={`No hay aficionados para «${debounced}». Prueba otro username o nombre.`}
          />
        )
      ) : null}

      {showSuggestions ? (
        discoverLoading ? (
          <PeopleListSkeleton count={4} className="max-w-xl" label="Cargando sugerencias" />
        ) : suggestions.length > 0 ? (
          <section className="max-w-xl space-y-3" aria-label="Aficionados sugeridos">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
                Aficionados sugeridos
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Priorizamos aficionados con tu mismo equipo o cercanos. Empieza a seguir gente para
                llenar tu feed.
              </p>
            </div>
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
            title="Encuentra aficionados"
            description="Busca por username o nombre, síguelos y verás sus partidos en tu feed."
          />
        )
      ) : null}
    </div>
  );
}
