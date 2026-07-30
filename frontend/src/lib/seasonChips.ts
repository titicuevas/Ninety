/**
 * Años de temporada de liga (football-data usa el año de inicio).
 * Desde julio cuenta el año actual como temporada en curso.
 */
export function leagueSeasonYears(count = 5, now = new Date()): number[] {
  const seasonStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => seasonStart - i);
}

export type SeasonChipOption = { value: number | undefined; label: string };

type CompetitionLike = {
  defaultSeason?: number;
  seasons?: number[];
};

export function seasonChipOptions(
  competition?: CompetitionLike | null,
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
