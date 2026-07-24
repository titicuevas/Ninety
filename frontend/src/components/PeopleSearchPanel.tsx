import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, UserMinus, UserPlus, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToggleFollow } from '@/hooks/useFollowUser';
import { MIN_PEOPLE_QUERY, useProfileSearch } from '@/hooks/useProfileSearch';
import { profilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/profile';

function PeopleResultRow({ profile }: { profile: Profile }) {
  const username = profile.username!;
  const [followed, setFollowed] = useState(!!profile.followed_by_me);
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
        <Link to={profilePath(username)} className="font-medium text-foreground hover:text-primary hover:underline">
          {name}
        </Link>
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
  const [debounced, setDebounced] = useState(initialQuery.trim());

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const { data, isLoading, isFetching, isError, error } = useProfileSearch(debounced);
  const profiles = data?.profiles ?? [];
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Buscando aficionados…
        </div>
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
              <PeopleResultRow key={profile.id} profile={profile} />
            ))}
          </ul>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center sm:p-8">
              <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" aria-hidden />
              <p className="font-medium">Sin resultados</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No hay aficionados para «{debounced}». Prueba otro username o nombre.
              </p>
            </CardContent>
          </Card>
        )
      ) : null}

      {!query.trim() ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center sm:p-8">
            <p className="font-medium">Encuentra aficionados</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Busca por username o nombre, síguelos y verás sus partidos en tu feed.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
