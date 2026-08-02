/** Rango YYYY-MM-DD para filtrar partidos por mes en football-data.org. */
export interface MatchDateRange {
  dateFrom: string;
  dateTo: string;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function parseMonth(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1] ?? 30;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Año de inicio de temporada de liga (corte en julio). */
export function currentLeagueSeasonStart(now = new Date()): number {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Resuelve el año civil de un mes dentro de una temporada.
 * Ligas (ago–may): ago–dic → season; ene–jul → season+1.
 * Torneos de año civil (Mundial/Euro): siempre season.
 */
export function calendarYearForSeasonMonth(
  month: number,
  season: number,
  calendarYearSeason = false,
): number {
  if (calendarYearSeason) return season;
  return month >= 8 ? season : season + 1;
}

export function resolveMonthDateRange(options: {
  month: number;
  season?: number;
  /** true = Mundial/Eurocopa (el `season` es el año del torneo). */
  calendarYearSeason?: boolean;
  now?: Date;
}): MatchDateRange {
  const { month, calendarYearSeason = false, now = new Date() } = options;
  const season = options.season ?? currentLeagueSeasonStart(now);
  const year = calendarYearForSeasonMonth(month, season, calendarYearSeason);
  const lastDay = daysInMonth(year, month);
  return {
    dateFrom: `${year}-${pad2(month)}-01`,
    dateTo: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

export function matchInDateRange(
  match: { utcDate?: string },
  range: MatchDateRange,
): boolean {
  if (!match.utcDate) return false;
  const day = match.utcDate.slice(0, 10);
  return day >= range.dateFrom && day <= range.dateTo;
}

export function filterMatchesByDateRange<T extends { utcDate?: string }>(
  matches: T[],
  range: MatchDateRange | undefined,
): T[] {
  if (!range) return matches;
  return matches.filter((match) => matchInDateRange(match, range));
}
