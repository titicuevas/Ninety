export const MONTH_CHIP_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

export type MonthChipOption = { value: number | undefined; label: string };

type CompetitionLike = {
  seasons?: number[];
};

function currentLeagueSeasonStart(now = new Date()): number {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function calendarYearForSeasonMonth(
  month: number,
  season: number,
  calendarYearSeason = false,
): number {
  if (calendarYearSeason) return season;
  return month >= 8 ? season : season + 1;
}

/** Chips de mes (1–12) para acotar la búsqueda de partidos. */
export function monthChipOptions(): MonthChipOption[] {
  return [
    { value: undefined, label: 'Cualquier mes' },
    ...MONTH_CHIP_LABELS.map((label, index) => ({
      value: index + 1,
      label,
    })),
  ];
}

export function parseMonthParam(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const month = Number(raw);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined;
}

/** Texto corto para hints: «Mar 2025». */
export function monthHintLabel(
  month: number,
  season: number | undefined,
  competition?: CompetitionLike | null,
  now = new Date(),
): string {
  const calendarYearSeason = Boolean(competition?.seasons?.length);
  const resolvedSeason = season ?? currentLeagueSeasonStart(now);
  const year = calendarYearForSeasonMonth(month, resolvedSeason, calendarYearSeason);
  return `${MONTH_CHIP_LABELS[month - 1]} ${year}`;
}
