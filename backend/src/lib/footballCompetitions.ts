export interface CuratedCompetition {
  code: string;
  name: string;
  group: string;
  groupLabel: string;
  /** ID numérico en football-data.org (para filtrar partidos de un equipo). */
  apiId?: number;
  /** El listado por competición no está en el plan gratuito — hay que buscar por equipo/selección. */
  teamSearchOnly?: boolean;
  defaultSeason?: number;
  seasons?: number[];
}

export const FOOTBALL_COMPETITION_GROUPS = [
  {
    id: 'leagues',
    label: 'Ligas',
    competitions: [
      { code: 'PD', name: 'La Liga', apiId: 2014 },
      { code: 'PL', name: 'Premier League', apiId: 2021 },
      { code: 'SA', name: 'Serie A', apiId: 2019 },
      { code: 'BL1', name: 'Bundesliga', apiId: 2002 },
      { code: 'FL1', name: 'Ligue 1', apiId: 2015 },
      { code: 'DED', name: 'Eredivisie', apiId: 2003 },
      { code: 'PPL', name: 'Primeira Liga', apiId: 2017 },
    ],
  },
  {
    id: 'europe',
    label: 'Copas europeas',
    competitions: [
      { code: 'CL', name: 'Champions League', apiId: 2001 },
      { code: 'EL', name: 'Europa League', apiId: 2146 },
    ],
  },
  {
    id: 'national',
    label: 'Selecciones',
    competitions: [
      { code: 'WC', name: 'Mundial', apiId: 2000, teamSearchOnly: true, defaultSeason: 2026, seasons: [2026, 2022, 2018] },
      { code: 'EC', name: 'Eurocopa', apiId: 2018, teamSearchOnly: true, defaultSeason: 2024, seasons: [2024, 2020, 2016] },
    ],
  },
  {
    id: 'cups',
    label: 'Copas nacionales',
    competitions: [
      { code: 'CDR', name: 'Copa del Rey', apiId: 2072, teamSearchOnly: true },
      { code: 'FAC', name: 'FA Cup', apiId: 2139, teamSearchOnly: true },
      { code: 'DFB', name: 'DFB-Pokal', apiId: 2129, teamSearchOnly: true },
      { code: 'CLI', name: 'Copa Libertadores', apiId: 2152, teamSearchOnly: true },
    ],
  },
] as const;

export function getCuratedCompetitions(): CuratedCompetition[] {
  return FOOTBALL_COMPETITION_GROUPS.flatMap((group) =>
    group.competitions.map((comp) => ({
      code: comp.code,
      name: comp.name,
      group: group.id,
      groupLabel: group.label,
      apiId: 'apiId' in comp ? comp.apiId : undefined,
      teamSearchOnly: 'teamSearchOnly' in comp ? comp.teamSearchOnly : undefined,
      defaultSeason: 'defaultSeason' in comp ? comp.defaultSeason : undefined,
      seasons: 'seasons' in comp ? [...comp.seasons] : undefined,
    })),
  );
}

export function findCuratedCompetition(code: string): CuratedCompetition | undefined {
  return getCuratedCompetitions().find((c) => c.code === code);
}

/**
 * Años de temporada de liga (football-data usa el año de inicio).
 * Desde julio cuenta el año actual como temporada en curso.
 */
export function leagueSeasonYears(count = 5, now = new Date()): number[] {
  const seasonStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => seasonStart - i);
}

export type SeasonChipOption = { value: number | undefined; label: string };

/** Opciones de chip para filtros de temporada (competición curada o ligas genéricas). */
export function seasonChipOptions(
  competition?: CuratedCompetition | null,
  now = new Date(),
): SeasonChipOption[] {
  if (competition?.seasons?.length) {
    return [
      { value: undefined, label: 'Cualquiera' },
      ...competition.seasons.map((year) => ({
        value: year,
        label: year === competition.defaultSeason ? `${year} (reciente)` : String(year),
      })),
    ];
  }

  const years = leagueSeasonYears(5, now);
  return [
    { value: undefined, label: 'Cualquiera' },
    { value: years[0], label: 'Esta temporada' },
    ...years.slice(1).map((year) => ({ value: year, label: String(year) })),
  ];
}
