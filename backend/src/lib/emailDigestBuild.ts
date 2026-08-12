import { localYmdInTimeZone } from './diaryPushBuild.js';
import { isValidIanaTimeZone } from './notificationQuietHours.js';

const MS_DAY = 24 * 60 * 60 * 1000;

export type EmailDigestCapsule = {
  id: string;
  watched_at: string;
  home_team_name: string;
  away_team_name: string;
  rating: number | null;
};

export type EmailDigestCta = {
  href: string;
  label: string;
};

export type EmailDigestContent = {
  weekKey: string;
  kind: 'summary' | 'nudge';
  title: string;
  intro: string;
  matches: Array<{ label: string; rating: number | null }>;
  weekCount: number;
  avgRating: number | null;
  totalCapsules: number;
  cta: EmailDigestCta;
};

function parseWatchedAt(raw: string): number | null {
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

function matchLabel(c: EmailDigestCapsule): string {
  return `${c.home_team_name}–${c.away_team_name}`;
}

/** Lunes local en zona IANA (fallback UTC). */
export function isLocalMonday(date: Date, timeZone: string): boolean {
  const tz = isValidIanaTimeZone(timeZone) ? timeZone.trim() : 'UTC';
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  }).format(date);
  return weekday === 'Mon';
}

/**
 * Clave de semana ISO (YYYY-Www) del día local del usuario.
 * Usa el algoritmo ISO a partir del calendario local.
 */
export function isoWeekKeyInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = localYmdInTimeZone(date, timeZone);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / MS_DAY + 1) / 7);
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}

function capsulesInLastDays(
  capsules: EmailDigestCapsule[],
  nowMs: number,
  days: number,
): EmailDigestCapsule[] {
  const cutoff = nowMs - days * MS_DAY;
  const out: EmailDigestCapsule[] = [];
  for (const c of capsules) {
    const t = parseWatchedAt(c.watched_at);
    if (t != null && t >= cutoff) out.push(c);
  }
  out.sort((a, b) => {
    const ta = parseWatchedAt(a.watched_at) ?? 0;
    const tb = parseWatchedAt(b.watched_at) ?? 0;
    return tb - ta;
  });
  return out;
}

function averageRating(capsules: EmailDigestCapsule[]): number | null {
  const ratings = capsules
    .map((c) => c.rating)
    .filter((r): r is number => typeof r === 'number' && Number.isFinite(r));
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/**
 * Resumen del diario para el email semanal (no feed social).
 * Un solo CTA según estado: calendario / añadir / explorar / quiero ir.
 */
export function buildEmailDigestContent(
  capsules: EmailDigestCapsule[],
  options: { now?: Date; timeZone?: string },
): EmailDigestContent {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? 'UTC';
  const weekKey = isoWeekKeyInTimeZone(now, timeZone);
  const recent = capsulesInLastDays(capsules, now.getTime(), 7);
  const weekCount = recent.length;
  const avgRating = averageRating(recent);
  const matches = recent.slice(0, 5).map((c) => ({
    label: matchLabel(c),
    rating: typeof c.rating === 'number' ? c.rating : null,
  }));

  if (weekCount > 0) {
    const ratingBit =
      avgRating != null ? ` Media de la semana: ${avgRating}/5.` : '';
    return {
      weekKey,
      kind: 'summary',
      title: 'Tu semana en Ninety',
      intro:
        weekCount === 1
          ? `Has guardado 1 partido esta semana.${ratingBit}`
          : `Has guardado ${weekCount} partidos esta semana.${ratingBit}`,
      matches,
      weekCount,
      avgRating,
      totalCapsules: capsules.length,
      cta: { href: '/diary/calendar', label: 'Ver calendario' },
    };
  }

  if (capsules.length === 0) {
    return {
      weekKey,
      kind: 'nudge',
      title: 'Empieza tu diario',
      intro:
        'Aún no tienes Capsules. Guarda el próximo partido que veas y Ninety lo recordará por ti.',
      matches: [],
      weekCount: 0,
      avgRating: null,
      totalCapsules: 0,
      cta: { href: '/search', label: 'Añadir Capsule' },
    };
  }

  return {
    weekKey,
    kind: 'nudge',
    title: 'Tu diario te espera',
    intro: `Esta semana no has añadido partidos (llevas ${capsules.length} en total). ¿Hay alguno reciente o uno al que quieras ir?`,
    matches: [],
    weekCount: 0,
    avgRating: null,
    totalCapsules: capsules.length,
    cta:
      capsules.length >= 5
        ? { href: '/want-to-go', label: 'Quiero ir' }
        : { href: '/collections/explore', label: 'Explorar' },
  };
}
