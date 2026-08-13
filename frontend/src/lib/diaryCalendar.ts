import type { Capsule } from '@/types/capsule';

export type CalendarCell =
  | { kind: 'pad' }
  | { kind: 'day'; date: string; day: number; count: number };

export type CalendarMonth = {
  year: number;
  month: number;
};

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

const monthTitleFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
});

export function weekdayLabels(): readonly string[] {
  return WEEKDAY_LABELS;
}

export function formatCalendarMonthTitle(year: number, month: number): string {
  const raw = monthTitleFormatter.format(new Date(year, month - 1, 1));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function parseCalendarMonthParam(
  yearRaw: string | null,
  monthRaw: string | null,
  now = new Date(),
): CalendarMonth {
  const year = yearRaw != null ? Number(yearRaw) : NaN;
  const month = monthRaw != null ? Number(monthRaw) : NaN;
  if (
    Number.isInteger(year) &&
    year >= 1990 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function shiftCalendarMonth(base: CalendarMonth, delta: number): CalendarMonth {
  const idx = base.year * 12 + (base.month - 1) + delta;
  const year = Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  return { year, month };
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Monday-first grid for the given month; pads empty cells. */
export function buildMonthGrid(
  year: number,
  month: number,
  countsByDate: Map<string, number>,
): CalendarCell[] {
  const first = new Date(year, month - 1, 1);
  // JS: 0=Sun … 6=Sat → Monday-first offset 0–6
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < mondayOffset; i++) {
    cells.push({ kind: 'pad' });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = toIsoDate(year, month, day);
    cells.push({
      kind: 'day',
      date,
      day,
      count: countsByDate.get(date) ?? 0,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'pad' });
  }

  return cells;
}

export function countCapsulesByWatchedDate(capsules: Capsule[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const capsule of capsules) {
    const key = String(capsule.watched_at).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function capsulesForDate(capsules: Capsule[], date: string): Capsule[] {
  return capsules
    .filter((c) => String(c.watched_at).slice(0, 10) === date)
    .sort((a, b) => {
      const byWatched = String(b.watched_at).localeCompare(String(a.watched_at));
      if (byWatched !== 0) return byWatched;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
}

/** Cuántas Capsules del mes son públicas (shareable). */
export function countPublicCapsules(capsules: { is_public?: boolean | null }[]): number {
  return capsules.filter((c) => c.is_public !== false).length;
}
