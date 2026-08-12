/** Helpers for GET /api/capsules/me/calendar — month range by watched_at. */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DiaryCalendarMonth = {
  year: number;
  month: number;
  from: string;
  to: string;
};

export type DiaryCalendarDayCount = {
  date: string;
  count: number;
};

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** month is 1–12. Returns inclusive watched_at bounds as YYYY-MM-DD. */
export function resolveCalendarMonth(
  year: number,
  month: number,
): DiaryCalendarMonth | null {
  if (!Number.isInteger(year) || year < 1990 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  const last = daysInMonth(year, month);
  const mm = String(month).padStart(2, '0');
  return {
    year,
    month,
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(last).padStart(2, '0')}`,
  };
}

export function watchedAtToDateKey(watchedAt: string): string | null {
  const key = String(watchedAt).slice(0, 10);
  return isValidIsoDate(key) ? key : null;
}

/** Aggregate capsule counts per watched_at day (YYYY-MM-DD). */
export function buildCalendarDayCounts(
  rows: { watched_at: string }[],
): DiaryCalendarDayCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = watchedAtToDateKey(row.watched_at);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

const monthTitleFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
});

/** Título de mes capitalizado (p. ej. «Agosto de 2026»). */
export function formatDiaryMonthTitle(year: number, month: number): string {
  const raw = monthTitleFormatter.format(new Date(year, month - 1, 1));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Copy OG / share del mes público del diario. */
export function buildPublicDiaryMonthShareCopy(options: {
  displayName: string;
  username: string;
  year: number;
  month: number;
  total: number;
}): { title: string; description: string } {
  const monthTitle = formatDiaryMonthTitle(options.year, options.month);
  const name = options.displayName.trim() || `@${options.username}`;
  const countLabel =
    options.total === 1 ? '1 Capsule pública' : `${options.total} Capsules públicas`;
  return {
    title: `${monthTitle} de ${name} | Ninety`,
    description: `${countLabel} en el diario futbolero de @${options.username}`.slice(0, 180),
  };
}
