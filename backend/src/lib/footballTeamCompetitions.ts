import { fetchFootballApi } from './footballApi.js';
import { getCached, setCached } from './footballCache.js';
import {
  getCuratedCompetitions,
  findCuratedCompetition,
  type CuratedCompetition,
} from './footballCompetitions.js';
import { fetchCompetitionTeams, loadTeamsForSearch } from './footballTeamCatalog.js';

interface RunningCompetition {
  id?: number;
  name?: string;
  code?: string;
}

interface TeamDetailResponse {
  id: number;
  name: string;
  runningCompetitions?: RunningCompetition[];
}

export interface ResolvedTeam {
  id: number;
  name: string;
}

export interface TeamCompetitionsResult {
  team: ResolvedTeam | null;
  competitions: CuratedCompetition[];
  filtered: boolean;
}

const CLUB_NAME_PATTERN = /\b(FC|CF|Club|UD|CD|RCD|Balompié|Balompie|United|City|Athletic)\b/i;

/** Copa doméstica asociada a cada liga en football-data.org */
const DOMESTIC_CUP_BY_LEAGUE: Record<string, string> = {
  PD: 'CDR',
  PL: 'FAC',
  BL1: 'DFB',
};

const EUROPEAN_CODES = ['CL', 'EL'] as const;
const NATIONAL_CODES = ['WC', 'EC'] as const;

function isLikelyClub(team: { name: string }): boolean {
  return CLUB_NAME_PATTERN.test(team.name);
}

function mapRunningToCurated(running: RunningCompetition[]): CuratedCompetition[] {
  const curated = getCuratedCompetitions();
  const codes = new Set(running.map((c) => c.code).filter(Boolean));
  const ids = new Set(running.map((c) => c.id).filter((id): id is number => id != null));

  const matched = curated.filter(
    (comp) => (comp.code && codes.has(comp.code)) || (comp.apiId != null && ids.has(comp.apiId)),
  );

  return matched.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel) || a.name.localeCompare(b.name));
}

function mergeRunningCompetitions(...sources: RunningCompetition[][]): RunningCompetition[] {
  const byCode = new Map<string, RunningCompetition>();

  for (const list of sources) {
    for (const comp of list) {
      const key = comp.code ?? String(comp.id ?? '');
      if (key) byCode.set(key, comp);
    }
  }

  return Array.from(byCode.values());
}

function competitionCodesToCheck(team: ResolvedTeam, fromRunning: RunningCompetition[]): string[] {
  if (!isLikelyClub(team)) return [...NATIONAL_CODES];

  const codes = new Set<string>(EUROPEAN_CODES);
  const leagueCode = fromRunning.find((c) => c.code && DOMESTIC_CUP_BY_LEAGUE[c.code])?.code;

  if (leagueCode) {
    const cup = DOMESTIC_CUP_BY_LEAGUE[leagueCode];
    if (cup) codes.add(cup);
  } else {
    codes.add('CDR');
  }

  return [...codes];
}

/** Verifica plantillas de CL, EL y copa doméstica — la API no las incluye en runningCompetitions. */
async function competitionsByTeamMembership(
  team: ResolvedTeam,
  fromRunning: RunningCompetition[],
): Promise<RunningCompetition[]> {
  const found: RunningCompetition[] = [];

  for (const code of competitionCodesToCheck(team, fromRunning)) {
    const comp = findCuratedCompetition(code);
    if (!comp) continue;

    const teams = await fetchCompetitionTeams(comp, comp.defaultSeason);
    if (!teams.some((entry) => entry.id === team.id)) continue;

    found.push({ id: comp.apiId, code: comp.code, name: comp.name });
  }

  return found;
}

export async function getTeamCompetitionsForQuery(query: string): Promise<TeamCompetitionsResult> {
  const trimmed = query.trim();
  const all = getCuratedCompetitions();

  if (!trimmed) {
    return { team: null, competitions: all, filtered: false };
  }

  const teams = await loadTeamsForSearch({ query: trimmed });
  const team = teams[0];

  if (!team?.id) {
    return { team: null, competitions: all, filtered: false };
  }

  const resolved: ResolvedTeam = { id: team.id, name: team.name };
  const cacheKey = `team-comps:${team.id}`;
  const cached = getCached<TeamCompetitionsResult>(cacheKey);
  if (cached) return cached;

  const detail = await fetchFootballApi<TeamDetailResponse>(`/teams/${team.id}`);
  const fromRunning = detail.runningCompetitions ?? [];
  const fromMembership = await competitionsByTeamMembership(resolved, fromRunning);
  const running = mergeRunningCompetitions(fromRunning, fromMembership);

  const competitions = mapRunningToCurated(running);

  const result: TeamCompetitionsResult = {
    team: resolved,
    competitions: competitions.length > 0 ? competitions : all,
    filtered: competitions.length > 0,
  };

  setCached(cacheKey, result);
  return result;
}

export function isCompetitionAvailable(code: string, competitions: CuratedCompetition[]): boolean {
  if (!code) return true;
  return competitions.some((comp) => comp.code === code);
}

export function defaultSeasonForCompetition(code: string): number | undefined {
  return findCuratedCompetition(code)?.defaultSeason ?? findCuratedCompetition(code)?.seasons?.[0];
}
