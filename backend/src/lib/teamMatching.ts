export interface TeamLike {
  id?: number;
  name: string;
  shortName?: string;
}

const IGNORED_WORDS = new Set([
  'real',
  'club',
  'cf',
  'fc',
  'cd',
  'ud',
  'rc',
  'r',
  'de',
  'the',
  'balompie',
  'balompié',
]);

/** Apodos y nombres en español → nombre canónico en football-data.org */
const TEAM_ALIASES: Record<string, string> = {
  madrid: 'Real Madrid CF',
  betis: 'Real Betis Balompié',
  barca: 'FC Barcelona',
  barça: 'FC Barcelona',
  barsa: 'FC Barcelona',
  barcelona: 'FC Barcelona',
  espanyol: 'RCD Espanyol de Barcelona',
  español: 'RCD Espanyol de Barcelona',
  atleti: 'Club Atlético de Madrid',
  atletico: 'Club Atlético de Madrid',
  atlético: 'Club Atlético de Madrid',
  athletic: 'Athletic Club',
  bilbao: 'Athletic Club',
  espana: 'Spain',
  españa: 'Spain',
  alemania: 'Germany',
  inglaterra: 'England',
  francia: 'France',
  brasil: 'Brazil',
  italia: 'Italy',
  portugal: 'Portugal',
  holanda: 'Netherlands',
  paisesbajos: 'Netherlands',
  'paísesbajos': 'Netherlands',
  argentina: 'Argentina',
  mexico: 'Mexico',
  méxico: 'Mexico',
  usa: 'United States',
  estadosunidos: 'United States',
};

export function normalizeTeamText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeTeamText(value)
    .split(' ')
    .filter((token) => token.length > 0 && !IGNORED_WORDS.has(token));
}

function resolveAlias(query: string): string | undefined {
  const key = normalizeTeamText(query).replace(/\s+/g, '');
  return TEAM_ALIASES[key];
}

function isCitySuffixOnlyMatch(name: string, query: string): boolean {
  const tokens = tokenize(name);
  const q = normalizeTeamText(query);
  if (tokens.length < 2 || !q) return false;

  const lastToken = tokens[tokens.length - 1]!;
  const hasDistinctMatch = tokens.slice(0, -1).some((token) => token === q || token.startsWith(q));

  return lastToken === q && !hasDistinctMatch;
}

export function scoreTeamMatch(team: TeamLike, query: string): number {
  const normalizedQuery = normalizeTeamText(query);
  if (!normalizedQuery) return 0;

  const aliasTarget = resolveAlias(query);
  const names = [team.name, team.shortName ?? ''].filter(Boolean);
  const normalizedNames = names.map(normalizeTeamText);

  if (aliasTarget) {
    const target = normalizeTeamText(aliasTarget);
    for (const name of normalizedNames) {
      if (name === target) return 1000;
      if (name.includes(target) || target.includes(name)) return 950;
    }
    return 0;
  }

  const queryTokens = tokenize(query);
  let best = 0;

  for (const name of normalizedNames) {
    if (name === normalizedQuery) best = Math.max(best, 900);
    if (name.startsWith(normalizedQuery)) best = Math.max(best, 800);

    const nameTokens = tokenize(name);

    for (const qToken of queryTokens) {
      for (const nToken of nameTokens) {
        if (nToken === qToken) best = Math.max(best, 700);
        else if (nToken.startsWith(qToken) && qToken.length >= 3) best = Math.max(best, 600);
        else if (qToken.length >= 4 && nToken.includes(qToken)) best = Math.max(best, 500);
      }

      if (name.includes(qToken)) best = Math.max(best, 400);
    }

    if (name.includes(normalizedQuery)) best = Math.max(best, 300);

    if (isCitySuffixOnlyMatch(name, normalizedQuery)) {
      best = Math.min(best, 250);
    }
  }

  // Bonus: el nombre distintivo del club es la búsqueda (Barcelona, Betis…)
  for (const name of normalizedNames) {
    const tokens = tokenize(name);
    if (tokens.length === 1 && tokens[0] === normalizedQuery) {
      best = Math.max(best, 750);
    }
  }

  // Penaliza coincidencias débiles por ciudad compartida
  if (queryTokens.length === 1 && best > 0 && best < 700) {
    const citySuffixes = ['madrid', 'barcelona', 'sevilla', 'valencia', 'bilbao'];
    if (citySuffixes.includes(queryTokens[0]!)) {
      best -= 200;
    }
  }

  return best;
}

export interface ScoredTeam extends TeamLike {
  score: number;
}

export function rankTeamsByQuery(teams: TeamLike[], query: string, limit = 3): ScoredTeam[] {
  const scored = teams
    .map((team) => ({ ...team, score: scoreTeamMatch(team, query) }))
    .filter((team) => team.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const topScore = scored[0]!.score;
  const minScore = topScore >= 900 ? topScore - 50 : Math.max(350, topScore - 150);

  return scored.filter((team) => team.score >= minScore).slice(0, limit);
}

export function collectTeamNames(teams: TeamLike[], query?: string): Set<string> {
  const names = new Set<string>();

  for (const team of teams) {
    names.add(normalizeTeamText(team.name));
    if (team.shortName) names.add(normalizeTeamText(team.shortName));
  }

  if (query) {
    const alias = resolveAlias(query);
    if (alias) names.add(normalizeTeamText(alias));
  }

  return names;
}

export function matchInvolvesTeam(
  match: { homeTeam: TeamLike; awayTeam: TeamLike },
  teamIds: Set<number>,
  teamNames: Set<string>,
): boolean {
  const homeId = match.homeTeam.id;
  const awayId = match.awayTeam.id;

  if (homeId != null && teamIds.has(homeId)) return true;
  if (awayId != null && teamIds.has(awayId)) return true;

  const homeName = normalizeTeamText(match.homeTeam.name);
  const awayName = normalizeTeamText(match.awayTeam.name);
  const homeShort = match.homeTeam.shortName ? normalizeTeamText(match.homeTeam.shortName) : '';
  const awayShort = match.awayTeam.shortName ? normalizeTeamText(match.awayTeam.shortName) : '';

  for (const name of teamNames) {
    if (!name) continue;
    if (homeName === name || awayName === name || homeShort === name || awayShort === name) return true;
    if (homeName.includes(name) || awayName.includes(name)) return true;
    if (name.includes(homeName) || name.includes(awayName)) return true;
  }

  return false;
}
