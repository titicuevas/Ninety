import { FootballApiError, fetchFootballApi } from './footballApi.js';
import {
  findCuratedCompetition,
  type CuratedCompetition,
} from './footballCompetitions.js';
import { rankTeamsByQuery, type ScoredTeam, type TeamLike } from './teamMatching.js';

interface TeamsResponse {
  teams?: TeamLike[];
}

/** Apodos → competiciones donde buscar primero (menos llamadas a la API). */
const QUERY_COMPETITION_HINTS: Record<string, string[]> = {
  betis: ['PD'],
  madrid: ['PD'],
  barcelona: ['PD'],
  barsa: ['PD'],
  atletico: ['PD'],
  atleti: ['PD'],
  athletic: ['PD'],
  bilbao: ['PD'],
  sevilla: ['PD'],
  valencia: ['PD'],
  villarreal: ['PD'],
  espana: ['EC'],
  españa: ['EC'],
  spain: ['EC'],
  argentina: ['EC', 'CL'],
  francia: ['EC'],
  alemania: ['EC'],
  inglaterra: ['EC'],
  italia: ['EC'],
  portugal: ['EC'],
  brasil: ['EC', 'CL'],
};

const DEFAULT_CATALOG_CODES = ['PD', 'PL', 'CL'] as const;

function catalogCodesForQuery(query: string, competitionCode?: string): string[] {
  if (competitionCode) return [competitionCode];

  const key = query
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '');

  return QUERY_COMPETITION_HINTS[key] ?? [...DEFAULT_CATALOG_CODES];
}

function competitionTeamsPath(comp: CuratedCompetition, season?: number): string | null {
  if (!comp.apiId && !comp.code) return null;

  const params = new URLSearchParams();
  const resolvedSeason = season ?? comp.defaultSeason;
  if (resolvedSeason) params.set('season', String(resolvedSeason));

  const query = params.toString();
  return `/competitions/${comp.code}/teams${query ? `?${query}` : ''}`;
}

export async function fetchCompetitionTeams(comp: CuratedCompetition, season?: number): Promise<TeamLike[]> {
  const path = competitionTeamsPath(comp, season);
  if (!path) return [];

  try {
    const data = await fetchFootballApi<TeamsResponse>(path);
    return data.teams ?? [];
  } catch (err) {
    if (err instanceof FootballApiError && (err.status === 403 || err.status === 404)) {
      return [];
    }
    throw err;
  }
}

function dedupeTeams(teams: TeamLike[]): TeamLike[] {
  const byId = new Map<number, TeamLike>();
  const byName = new Map<string, TeamLike>();

  for (const team of teams) {
    if (team.id != null) {
      byId.set(team.id, team);
      continue;
    }
    const key = team.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, team);
  }

  return [...byId.values(), ...byName.values()];
}

export async function loadTeamsForSearch(options: {
  query: string;
  competitionCode?: string;
  season?: number;
}): Promise<ScoredTeam[]> {
  const { query, competitionCode, season } = options;
  const codes = catalogCodesForQuery(query, competitionCode);
  let catalog: TeamLike[] = [];

  for (const code of codes) {
    const comp = findCuratedCompetition(code);
    if (!comp) continue;

    let teams = await fetchCompetitionTeams(comp, season);

    if (teams.length === 0 && comp.teamSearchOnly && comp.group === 'national') {
      const euro = findCuratedCompetition('EC');
      if (euro) teams = await fetchCompetitionTeams(euro, season ?? euro.defaultSeason);
    }

    catalog = dedupeTeams([...catalog, ...teams]);
    const ranked = rankTeamsByQuery(catalog, query, 3);
    if (ranked.length > 0) return ranked;
  }

  if (catalog.length === 0) {
    const fallback = await fetchFootballApi<TeamsResponse>('/teams');
    catalog = fallback.teams ?? [];
  }

  return rankTeamsByQuery(catalog, query, 3);
}
