import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip, filterChipRowClass } from '@/components/FilterChip';
import { MatchListSkeleton } from '@/components/ListSkeletons';
import { MatchCard } from '@/components/MatchCard';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { WantToGoButton } from '@/components/WantToGoButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFootballCompetitions } from '@/hooks/useFootballCompetitions';
import { useCapsules } from '@/hooks/useCapsules';
import { MIN_QUERY_LENGTH, useMatchSearch } from '@/hooks/useMatchSearch';
import { useProfile } from '@/hooks/useProfile';
import { useWantToGoIds } from '@/hooks/useWantToGo';
import { useTeamCompetitions } from '@/hooks/useTeamCompetitions';
import { saveDraftMatch } from '@/lib/draftMatch';
import { groupMatchesByCompetition } from '@/lib/groupMatches';
import { seasonChipOptions } from '@/lib/seasonChips';
import { monthChipOptions, monthHintLabel, parseMonthParam } from '@/lib/monthChips';
import type { CuratedCompetition, FootballMatch } from '@/types/football';
import { cn } from '@/lib/utils';

function ManualMatchCta() {
  return (
    <Button asChild type="button" variant="secondary">
      <Link to="/search/manual">Añadir partido manual</Link>
    </Button>
  );
}

const NO_COMPETITIONS: CuratedCompetition[] = [];
const NO_MATCHES: FootballMatch[] = [];
const MONTH_CHIPS = monthChipOptions();

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

function parseSeasonParam(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1900 ? n : undefined;
}

const selectClassName = cn(
  'flex h-12 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-base sm:h-11 sm:text-sm',
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

type MatchSearchFiltersProps = {
  query: string;
  onQueryChange: (value: string) => void;
  activeCompetition: string;
  onCompetitionChange: (code: string) => void;
  groupedCompetitions: Array<[string, CuratedCompetition[]]>;
  resolvedTeam: { name: string } | null;
  isLoadingTeamCompetitions: boolean;
  debouncedQuery: string;
  showSeasonChips: boolean;
  seasonChips: ReturnType<typeof seasonChipOptions>;
  activeSeason: number | undefined;
  onSeasonChange: (value: number | undefined) => void;
  showMonthChips: boolean;
  activeMonth: number | undefined;
  onMonthChange: (value: number | undefined) => void;
};

function MatchSearchFilters({
  query,
  onQueryChange,
  activeCompetition,
  onCompetitionChange,
  groupedCompetitions,
  resolvedTeam,
  isLoadingTeamCompetitions,
  debouncedQuery,
  showSeasonChips,
  seasonChips,
  activeSeason,
  onSeasonChange,
  showMonthChips,
  activeMonth,
  onMonthChange,
}: MatchSearchFiltersProps) {
  return (
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
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Ej. Betis, Madrid, Argentina, Liverpool..."
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
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
          onChange={(e) => onCompetitionChange(e.target.value)}
          className={selectClassName}
          disabled={isLoadingTeamCompetitions && debouncedQuery.length >= MIN_QUERY_LENGTH}
          aria-label="Competición"
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

      {showSeasonChips ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label id="season-filter-label">Temporada</Label>
          <div className={filterChipRowClass} role="group" aria-labelledby="season-filter-label">
            {seasonChips.map((chip) => (
              <FilterChip
                key={chip.value ?? 'any'}
                active={activeSeason === chip.value}
                onClick={() => onSeasonChange(chip.value)}
              >
                {chip.label}
              </FilterChip>
            ))}
          </div>
        </div>
      ) : null}

      {showMonthChips ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label id="month-filter-label">Mes</Label>
          <div className={filterChipRowClass} role="group" aria-labelledby="month-filter-label">
            {MONTH_CHIPS.map((chip) => (
              <FilterChip
                key={chip.value ?? 'any-month'}
                active={activeMonth === chip.value}
                onClick={() => onMonthChange(chip.value)}
              >
                {chip.label}
              </FilterChip>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type MatchSearchResultsProps = {
  matches: FootballMatch[];
  matchGroups: ReturnType<typeof groupMatchesByCompetition>;
  showGrouped: boolean;
  savedByMatchId: Map<number, string>;
  wantToGoIds: Set<number>;
  onSelectMatch: (match: FootballMatch) => void;
  activeCompetition: string;
  requiresTeamQuery: boolean;
  debouncedQuery: string;
  selectedCompetition: CuratedCompetition | undefined;
  activeSeason: number | undefined;
  activeMonth: number | undefined;
};

function MatchSearchResults({
  matches,
  matchGroups,
  showGrouped,
  savedByMatchId,
  wantToGoIds,
  onSelectMatch,
  activeCompetition,
  requiresTeamQuery,
  debouncedQuery,
  selectedCompetition,
  activeSeason,
  activeMonth,
}: MatchSearchResultsProps) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {matches.length > 0 ? (
        <div className="space-y-5 sm:space-y-8">
          {showGrouped
            ? matchGroups.map((group) => (
                <section key={group.key} className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-wide text-primary uppercase">
                    {group.label}
                  </h2>
                  <ul className="space-y-3">
                    {group.matches.map((match) => (
                      <li key={match.id} className="space-y-2">
                        <MatchCard
                          match={match}
                          savedCapsuleId={savedByMatchId.get(match.id)}
                          wantToGo={wantToGoIds.has(match.id)}
                          onSelect={() => onSelectMatch(match)}
                        />
                        <div className="pl-1">
                          <WantToGoButton match={match} saved={wantToGoIds.has(match.id)} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            : (
                <ul className="space-y-3">
                  {matches.map((match) => (
                    <li key={match.id} className="space-y-2">
                      <MatchCard
                        match={match}
                        savedCapsuleId={savedByMatchId.get(match.id)}
                        wantToGo={wantToGoIds.has(match.id)}
                        onSelect={() => onSelectMatch(match)}
                      />
                      <div className="pl-1">
                        <WantToGoButton match={match} saved={wantToGoIds.has(match.id)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
        </div>
      ) : (
        <EmptyState
          title="Sin resultados"
          description={
            activeCompetition
              ? requiresTeamQuery
                ? `No hay partidos de «${debouncedQuery}» en ${selectedCompetition?.name ?? 'este torneo'}${activeSeason != null ? ` (${activeSeason})` : ''}${activeMonth != null ? ` · ${monthHintLabel(activeMonth, activeSeason, selectedCompetition)}` : ''}. Prueba otro nombre, temporada o mes — o añádelo a mano.`
                : `No hay partidos en ${selectedCompetition?.name ?? 'esta competición'}${activeSeason != null ? ` ${activeSeason}` : ''}${activeMonth != null ? ` · ${monthHintLabel(activeMonth, activeSeason, selectedCompetition)}` : ''} para «${debouncedQuery || 'tu búsqueda'}». Prueba otro mes o temporada — o añádelo a mano.`
              : `No encontramos partidos para «${debouncedQuery}»${activeSeason != null ? ` en ${activeSeason}` : ''}${activeMonth != null ? ` · ${monthHintLabel(activeMonth, activeSeason, selectedCompetition)}` : ''}. Prueba otra temporada, mes, equipo o competición — o añádelo a mano.`
          }
        >
          <ManualMatchCta />
        </EmptyState>
      )}
    </div>
  );
}

export function MatchSearchPanel() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: profile } = useProfile();
  const favoriteTeam = profile?.favorite_team?.trim() || null;

  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => (params.get('q') ?? '').trim());
  const [competition, setCompetition] = useState(() => params.get('competition') ?? '');
  const [season, setSeason] = useState<number | undefined>(() => parseSeasonParam(params.get('season')));
  const [month, setMonth] = useState<number | undefined>(() => parseMonthParam(params.get('month')));

  const patchMatchParams = (patch: {
    competition?: string | null;
    season?: number | null;
    month?: number | null;
  }) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (patch.competition !== undefined) {
          if (patch.competition) next.set('competition', patch.competition);
          else next.delete('competition');
        }
        if (patch.season !== undefined) {
          if (patch.season != null) next.set('season', String(patch.season));
          else next.delete('season');
        }
        if (patch.month !== undefined) {
          if (patch.month != null) next.set('month', String(patch.month));
          else next.delete('month');
        }
        return next;
      },
      { replace: true },
    );
  };

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
  const activeSeason = season;
  const activeMonth = month;

  const selectedCompetition = useMemo(
    () => competitions.find((item) => item.code === activeCompetition),
    [competitions, activeCompetition],
  );
  const requiresTeamQuery = !!selectedCompetition?.teamSearchOnly;
  const seasonChips = useMemo(
    () => seasonChipOptions(selectedCompetition ?? null),
    [selectedCompetition],
  );
  const showSeasonChips =
    Boolean(activeCompetition) || debouncedQuery.length >= MIN_QUERY_LENGTH;
  const showMonthChips = showSeasonChips;

  const handleCompetitionChange = (code: string) => {
    setCompetition(code);
    const nextSeason = defaultSeasonFor(competitions.find((item) => item.code === code));
    setSeason(nextSeason);
    patchMatchParams({ competition: code || null, season: nextSeason ?? null });
  };

  const handleSeasonChange = (next: number | undefined) => {
    setSeason(next);
    patchMatchParams({ season: next ?? null });
  };

  const handleMonthChange = (next: number | undefined) => {
    setMonth(next);
    patchMatchParams({ month: next ?? null });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = query.trim();
      setDebouncedQuery(trimmed);
      if (window.location.pathname !== '/search') return;
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (trimmed) next.set('q', trimmed);
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, setParams]);

  const { data, isLoading, isFetching, isError, error, refetch, isRefetching } = useMatchSearch(
    debouncedQuery,
    {
    competition: activeCompetition || undefined,
    season: activeSeason,
    month: activeMonth,
  });

  const matches = data?.matches ?? NO_MATCHES;
  const matchGroups = useMemo(() => groupMatchesByCompetition(matches), [matches]);
  const showGrouped = !activeCompetition && matchGroups.length > 1;
  const { data: capsulesData } = useCapsules();
  const { data: wantToGoIdsData } = useWantToGoIds();
  const savedByMatchId = useMemo(() => {
    const map = new Map<number, string>();
    for (const capsule of capsulesData?.capsules ?? []) {
      map.set(capsule.match_id, capsule.id);
    }
    return map;
  }, [capsulesData?.capsules]);
  const wantToGoIds = useMemo(
    () => new Set(wantToGoIdsData?.match_ids ?? []),
    [wantToGoIdsData?.match_ids],
  );

  const canSearch =
    (activeCompetition && !requiresTeamQuery) || debouncedQuery.length >= MIN_QUERY_LENGTH;
  const isSearching = canSearch && (isLoading || isFetching);
  const showMinLengthHint =
    !activeCompetition && query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH;

  const seasonHint =
    activeSeason != null
      ? ` Temporada ${activeSeason}.`
      : selectedCompetition?.seasons?.length
        ? ' Cualquier edición.'
        : '';
  const monthHint =
    activeMonth != null
      ? ` Mes: ${monthHintLabel(activeMonth, activeSeason, selectedCompetition ?? null)}.`
      : '';

  const selectMatch = (match: FootballMatch) => {
    const existingId = savedByMatchId.get(match.id);
    if (existingId) {
      navigate(`/c/${existingId}`);
      return;
    }
    saveDraftMatch(match);
    window.location.assign('/capsules/new');
  };

  const searchFavoriteTeam = () => {
    if (!favoriteTeam) return;
    setQuery(favoriteTeam);
  };

  const showIdle = !query.trim() && !activeCompetition;

  return (
    <div className="space-y-5 sm:space-y-8">
      <MatchSearchFilters
        query={query}
        onQueryChange={setQuery}
        activeCompetition={activeCompetition}
        onCompetitionChange={handleCompetitionChange}
        groupedCompetitions={groupedCompetitions}
        resolvedTeam={resolvedTeam}
        isLoadingTeamCompetitions={isLoadingTeamCompetitions}
        debouncedQuery={debouncedQuery}
        showSeasonChips={showSeasonChips}
        seasonChips={seasonChips}
        activeSeason={activeSeason}
        onSeasonChange={handleSeasonChange}
        showMonthChips={showMonthChips}
        activeMonth={activeMonth}
        onMonthChange={handleMonthChange}
      />

      {showMinLengthHint ? (
        <p className="text-sm text-muted-foreground">
          Escribe al menos {MIN_QUERY_LENGTH} caracteres, o elige una competición para explorar sus
          partidos.
        </p>
      ) : null}

      {requiresTeamQuery && !debouncedQuery ? (
        <p className="text-sm text-muted-foreground">
          Para {selectedCompetition?.name ?? 'este torneo'} escribe una selección o equipo — por
          ejemplo España, Argentina, Betis…{seasonHint}
          {monthHint}
        </p>
      ) : null}

      {activeCompetition && !requiresTeamQuery && !debouncedQuery ? (
        <p className="text-sm text-muted-foreground">
          Mostrando partidos recientes de {selectedCompetition?.name ?? 'esta competición'}.
          {seasonHint}
          {monthHint}
        </p>
      ) : null}

      {isSearching ? <MatchListSkeleton count={4} /> : null}

      {isError ? (
        <div className="space-y-3">
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudo buscar partidos'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
          <p className="text-center text-sm text-muted-foreground">
            ¿El partido no está en el catálogo?{' '}
            <Link to="/search/manual" className="font-medium text-primary underline-offset-4 hover:underline">
              Añádelo a mano
            </Link>
          </p>
        </div>
      ) : null}

      {!isSearching && canSearch && !isError ? (
        <MatchSearchResults
          matches={matches}
          matchGroups={matchGroups}
          showGrouped={showGrouped}
          savedByMatchId={savedByMatchId}
          wantToGoIds={wantToGoIds}
          onSelectMatch={selectMatch}
          activeCompetition={activeCompetition}
          requiresTeamQuery={requiresTeamQuery}
          debouncedQuery={debouncedQuery}
          selectedCompetition={selectedCompetition}
          activeSeason={activeSeason}
          activeMonth={activeMonth}
        />
      ) : null}

      {showIdle ? (
        <EmptyState
          icon={Search}
          title="¿Qué partido viste?"
          description={
            favoriteTeam
              ? `Empieza por ${favoriteTeam} o escribe otro equipo. Si no está, añádelo a mano.`
              : 'Escribe un equipo o rival. Si no aparece, puedes añadirlo a mano.'
          }
        >
          {favoriteTeam ? (
            <Button type="button" onClick={searchFavoriteTeam}>
              Buscar {favoriteTeam}
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link to="/profile">Añadir equipo favorito</Link>
            </Button>
          )}
          <ManualMatchCta />
        </EmptyState>
      ) : null}
    </div>
  );
}
