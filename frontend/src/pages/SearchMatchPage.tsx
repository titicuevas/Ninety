import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFootballCompetitions } from '@/hooks/useFootballCompetitions';
import { MIN_QUERY_LENGTH, useMatchSearch } from '@/hooks/useMatchSearch';
import { useTeamCompetitions } from '@/hooks/useTeamCompetitions';
import { groupMatchesByCompetition } from '@/lib/groupMatches';
import type { CuratedCompetition, FootballMatch } from '@/types/football';
import { cn } from '@/lib/utils';

const NO_COMPETITIONS: CuratedCompetition[] = [];
const NO_MATCHES: FootballMatch[] = [];

function groupCompetitionsByLabel(competitions: CuratedCompetition[]) {
  const groups = new Map<string, CuratedCompetition[]>();

  for (const competition of competitions) {
    const list = groups.get(competition.groupLabel) ?? [];
    list.push(competition);
    groups.set(competition.groupLabel, list);
  }

  return Array.from(groups.entries());
}

function defaultSeasonFor(competition: CuratedCompetition | undefined): number | undefined {
  if (!competition?.seasons?.length) return undefined;
  return competition.defaultSeason ?? competition.seasons[0];
}

const selectClassName = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export function SearchMatchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [competition, setCompetition] = useState('');
  const [season, setSeason] = useState<number | undefined>();

  const { data: competitionsData } = useFootballCompetitions();
  const { data: teamCompetitionsData, isFetching: isLoadingTeamCompetitions } =
    useTeamCompetitions(debouncedQuery);

  const allCompetitions = competitionsData?.competitions ?? NO_COMPETITIONS;
  const competitions = useMemo(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) return allCompetitions;
    if (teamCompetitionsData?.filtered) return teamCompetitionsData.competitions;
    return allCompetitions;
  }, [allCompetitions, debouncedQuery, teamCompetitionsData]);
  const resolvedTeam = teamCompetitionsData?.team ?? null;

  const groupedCompetitions = useMemo(() => groupCompetitionsByLabel(competitions), [competitions]);

  const competitionIsValid =
    !competition ||
    competitions.length === 0 ||
    competitions.some((item) => item.code === competition);
  const activeCompetition = competitionIsValid ? competition : '';
  const activeSeason = activeCompetition ? season : undefined;

  const selectedCompetition = useMemo(
    () => competitions.find((item) => item.code === activeCompetition),
    [competitions, activeCompetition],
  );
  const requiresTeamQuery = !!selectedCompetition?.teamSearchOnly;

  const handleCompetitionChange = (code: string) => {
    setCompetition(code);
    setSeason(defaultSeasonFor(competitions.find((item) => item.code === code)));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching, isError, error } = useMatchSearch(debouncedQuery, {
    competition: activeCompetition || undefined,
    season: activeSeason,
  });

  const matches = data?.matches ?? NO_MATCHES;
  const matchGroups = useMemo(() => groupMatchesByCompetition(matches), [matches]);
  const showGrouped = !activeCompetition && matchGroups.length > 1;

  const canSearch =
    (activeCompetition && !requiresTeamQuery) || debouncedQuery.length >= MIN_QUERY_LENGTH;
  const isSearching = canSearch && (isLoading || isFetching);
  const showMinLengthHint =
    !activeCompetition && query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH;

  return (
    <Layout>
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Buscar partido</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Busca por equipo o filtra por competición — ligas, Champions, Mundial, Eurocopa y más.
          </p>
        </section>

        <section className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="match-search">Equipo o rival</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="match-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej. Betis, Madrid, Argentina, Liverpool..."
                className="pl-9"
                autoFocus
                aria-label="Buscar partido por equipos"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="competition-filter">Competición</Label>
            {resolvedTeam ? (
              <p className="text-xs text-muted-foreground">
                Competiciones de {resolvedTeam.name}
                {isLoadingTeamCompetitions ? '…' : ''}
              </p>
            ) : null}
            <select
              id="competition-filter"
              value={activeCompetition}
              onChange={(e) => handleCompetitionChange(e.target.value)}
              className={selectClassName}
              disabled={isLoadingTeamCompetitions && debouncedQuery.length >= MIN_QUERY_LENGTH}
            >
              <option value="">
                {resolvedTeam ? `Todas las de ${resolvedTeam.name}` : 'Todas (por equipo)'}
              </option>
              {groupedCompetitions.map(([label, items]) => (
                <optgroup key={label} label={label}>
                  {items.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedCompetition?.seasons?.length ? (
            <div className="space-y-1.5">
              <Label htmlFor="season-filter">Edición</Label>
              <select
                id="season-filter"
                value={season ?? ''}
                onChange={(e) => setSeason(Number(e.target.value))}
                className={selectClassName}
              >
                {selectedCompetition.seasons.map((year) => (
                  <option key={year} value={year}>
                    {year}
                    {year === selectedCompetition.defaultSeason ? ' (reciente)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </section>

        {showMinLengthHint ? (
          <p className="text-sm text-muted-foreground">
            Escribe al menos {MIN_QUERY_LENGTH} caracteres, o elige una competición para explorar sus partidos.
          </p>
        ) : null}

        {requiresTeamQuery && !debouncedQuery ? (
          <p className="text-sm text-muted-foreground">
            Para {selectedCompetition?.name ?? 'este torneo'} escribe una selección o equipo — por ejemplo
            España, Argentina, Betis…
            {selectedCompetition?.seasons?.length ? ` Edición ${season}.` : ''}
          </p>
        ) : null}

        {activeCompetition && !requiresTeamQuery && !debouncedQuery ? (
          <p className="text-sm text-muted-foreground">
            Mostrando partidos recientes de {selectedCompetition?.name ?? 'esta competición'}.
            {selectedCompetition?.seasons?.length ? ` Edición ${season}.` : ''}
          </p>
        ) : null}

        {isSearching ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Buscando partidos…
          </div>
        ) : null}

        {isError ? (
          <Card className="border-destructive/40">
            <CardContent className="p-5 text-sm text-destructive">
              {error instanceof Error ? error.message : 'No se pudo buscar partidos'}
            </CardContent>
          </Card>
        ) : null}

        {!isSearching && canSearch && !isError ? (
          matches.length > 0 ? (
            <div className="space-y-8">
              {showGrouped
                ? matchGroups.map((group) => (
                    <section key={group.key} className="space-y-3">
                      <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
                        {group.label}
                      </h2>
                      <ul className="space-y-3">
                        {group.matches.map((match) => (
                          <li key={match.id}>
                            <MatchCard
                              match={match}
                              onSelect={() => navigate('/capsules/new', { state: { match } })}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
                : (
                    <ul className="space-y-3">
                      {matches.map((match) => (
                        <li key={match.id}>
                          <MatchCard
                            match={match}
                            onSelect={() => navigate('/capsules/new', { state: { match } })}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center sm:p-10">
                <p className="text-lg font-medium">Sin resultados</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {activeCompetition
                    ? requiresTeamQuery
                      ? `No hay partidos de «${debouncedQuery}» en ${selectedCompetition?.name ?? 'este torneo'}. Prueba otro nombre (España, Argentina, Betis…).`
                      : `No hay partidos en ${selectedCompetition?.name ?? 'esta competición'} para «${debouncedQuery || 'tu búsqueda'}».`
                    : `No encontramos partidos para «${debouncedQuery}». Prueba otro equipo o elige una competición.`}
                </p>
              </CardContent>
            </Card>
          )
        ) : null}

        {!query.trim() && !activeCompetition ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center sm:p-10">
              <p className="text-lg font-medium">¿Qué partido viste?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Escribe un apodo o parte del nombre (Betis, Madrid, España…). No hace falta el nombre completo.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}
