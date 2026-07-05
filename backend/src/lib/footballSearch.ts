import { FootballApiError, fetchFootballApi } from './footballApi.js';
import { findCuratedCompetition, type CuratedCompetition } from './footballCompetitions.js';
import { loadTeamsForSearch } from './footballTeamCatalog.js';
import {
  collectTeamNames,
  matchInvolvesTeam,
  normalizeTeamText,
  type ScoredTeam,
} from './teamMatching.js';

interface FootballTeam {
  id?: number;
  name: string;
  shortName?: string;
  crest?: string;
}

interface FootballCompetition {
  id?: number;
  name?: string;
  code?: string;
}

export interface FootballMatch {
  id: number;
  utcDate?: string;
  status?: string;
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
  competition?: FootballCompetition;
}

interface MatchesResponse {
  matches?: FootballMatch[];
}

const MAX_RESULTS = 30;

function matchIncludesQuery(match: FootballMatch, query: string): boolean {
  const normalizedNeedle = normalizeTeamText(query);
  const home = normalizeTeamText(match.homeTeam.name);
  const away = normalizeTeamText(match.awayTeam.name);
  const homeShort = match.homeTeam.shortName ? normalizeTeamText(match.homeTeam.shortName) : '';
  const awayShort = match.awayTeam.shortName ? normalizeTeamText(match.awayTeam.shortName) : '';
  const competition = normalizeTeamText(match.competition?.name ?? '');

  return (
    home.includes(normalizedNeedle) ||
    away.includes(normalizedNeedle) ||
    homeShort.includes(normalizedNeedle) ||
    awayShort.includes(normalizedNeedle) ||
    competition.includes(normalizedNeedle)
  );
}

function matchInCompetition(match: FootballMatch, code: string): boolean {
  return match.competition?.code === code;
}

function sortMatchesByDateDesc(matches: FootballMatch[]): FootballMatch[] {
  return [...matches].sort((a, b) => {
    const da = a.utcDate ? new Date(a.utcDate).getTime() : 0;
    const db = b.utcDate ? new Date(b.utcDate).getTime() : 0;
    return db - da;
  });
}

function dedupeMatches(matches: FootballMatch[]): FootballMatch[] {
  const seen = new Set<number>();
  return matches.filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

function competitionMatchesPath(code: string, season?: number): string {
  const params = new URLSearchParams({ status: 'FINISHED' });
  if (season) params.set('season', String(season));
  return `/competitions/${code}/matches?${params.toString()}`;
}

function teamMatchesPath(teamId: number, competitionId?: number, season?: number): string {
  const params = new URLSearchParams({ status: 'FINISHED' });
  if (competitionId) params.set('competitions', String(competitionId));
  if (season) params.set('season', String(season));
  return `/teams/${teamId}/matches?${params.toString()}`;
}

export async function fetchCompetitionMatches(code: string, season?: number): Promise<FootballMatch[]> {
  const curated = findCuratedCompetition(code);
  const resolvedSeason = season ?? curated?.defaultSeason;
  const data = await fetchFootballApi<MatchesResponse>(competitionMatchesPath(code, resolvedSeason));
  return data.matches ?? [];
}

function seasonCandidates(curated: CuratedCompetition | undefined, season?: number): Array<number | undefined> {
  if (season) return [season];
  if (curated?.seasons?.length) return curated.seasons;
  const year = new Date().getFullYear();
  return [year, year - 1, undefined];
}

async function fetchTeamMatches(
  team: ScoredTeam,
  curated: CuratedCompetition | undefined,
  season?: number,
): Promise<FootballMatch[]> {
  if (!team.id) return [];

  const code = curated?.code;
  const competitionId = curated?.apiId;

  for (const candidateSeason of seasonCandidates(curated, season)) {
    try {
      const data = await fetchFootballApi<MatchesResponse>(
        teamMatchesPath(team.id, competitionId, candidateSeason),
      );
      const matches = data.matches ?? [];
      if (matches.length > 0) return matches;
    } catch (err) {
      if (err instanceof FootballApiError && err.status === 403) {
        if (code === 'WC') return [];

        if (competitionId) {
          try {
            const fallback = await fetchFootballApi<MatchesResponse>(
              teamMatchesPath(team.id, undefined, candidateSeason),
            );
            const filtered = (fallback.matches ?? []).filter((match) => (code ? matchInCompetition(match, code) : true));
            if (filtered.length > 0) return filtered;
          } catch {
            return [];
          }
        }
        return [];
      }
      throw err;
    }
  }

  return [];
}

async function searchTeamMatchesInCompetition(
  teams: ScoredTeam[],
  curated: CuratedCompetition | undefined,
  query: string,
  season?: number,
): Promise<FootballMatch[]> {
  const code = curated?.code ?? '';
  const teamIds = new Set(teams.map((team) => team.id).filter((id): id is number => id != null));
  const teamNames = collectTeamNames(teams, query);
  const collected: FootballMatch[] = [];

  for (const team of teams) {
    collected.push(...(await fetchTeamMatches(team, curated, season)));
  }

  return sortMatchesByDateDesc(
    dedupeMatches(collected)
      .filter((match) => (!code || matchInCompetition(match, code)) && matchInvolvesTeam(match, teamIds, teamNames))
      .slice(0, MAX_RESULTS),
  );
}

export async function searchMatchesInCompetition(
  code: string,
  query: string,
  season?: number,
): Promise<FootballMatch[]> {
  const curated = findCuratedCompetition(code);
  const trimmed = query.trim();

  if (trimmed) {
    const teams = await findTeamsByQuery(trimmed, code, season);
    if (teams.length > 0) {
      return searchTeamMatchesInCompetition(teams, curated, trimmed, season);
    }

    if (curated?.teamSearchOnly) return [];

    const matches = await fetchCompetitionMatches(code, season);
    return sortMatchesByDateDesc(matches.filter((match) => matchIncludesQuery(match, trimmed))).slice(
      0,
      MAX_RESULTS,
    );
  }

  if (curated?.teamSearchOnly) return [];

  const matches = await fetchCompetitionMatches(code, season);
  return sortMatchesByDateDesc(matches).slice(0, MAX_RESULTS);
}

async function findTeamsByQuery(query: string, competitionCode?: string, season?: number): Promise<ScoredTeam[]> {
  return loadTeamsForSearch({ query, competitionCode, season });
}

export async function searchMatchesByTeam(query: string): Promise<FootballMatch[]> {
  const teams = await findTeamsByQuery(query);
  if (teams.length === 0) return [];

  const teamIds = new Set(teams.map((team) => team.id).filter((id): id is number => id != null));
  const teamNames = collectTeamNames(teams, query);
  const collected: FootballMatch[] = [];

  for (const team of teams) {
    collected.push(...(await fetchTeamMatches(team, undefined)));
  }

  return sortMatchesByDateDesc(
    dedupeMatches(collected)
      .filter((match) => matchInvolvesTeam(match, teamIds, teamNames))
      .slice(0, MAX_RESULTS),
  );
}

export async function searchMatches(options: {
  query: string;
  competition?: string;
  season?: number;
}): Promise<FootballMatch[]> {
  const { query, competition, season } = options;
  const trimmed = query.trim();

  if (competition) {
    return searchMatchesInCompetition(competition, trimmed, season);
  }

  if (!trimmed) return [];

  return searchMatchesByTeam(trimmed);
}
