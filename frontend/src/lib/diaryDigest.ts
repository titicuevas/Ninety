import type { Capsule } from '@/types/capsule';

export type DiaryDigestKind = 'weekly' | 'nudge' | 'gap';

export type DiaryDigest = {
  kind: DiaryDigestKind;
  title: string;
  body: string;
  /** Días desde la Capsule más reciente (watched_at). */
  daysSinceLast: number;
  /** Capsules con watched_at en los últimos 7 días. */
  recentCount7: number;
  /** Capsules con watched_at en los últimos 30 días. */
  recentCount30: number;
  lastMatchLabel: string | null;
  href: string;
  hrefLabel: string;
};

const MS_DAY = 24 * 60 * 60 * 1000;

/** Umbral para resumen semanal (activo reciente). */
export const DIGEST_WEEKLY_MAX_DAYS = 6;
/** A partir de aquí: recordatorio suave. */
export const DIGEST_NUDGE_MIN_DAYS = 7;
/** A partir de aquí: hueco más largo. */
export const DIGEST_GAP_MIN_DAYS = 21;

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function parseWatchedAt(raw: string): number | null {
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

export function daysBetweenUtc(fromMs: number, toMs: number): number {
  const a = startOfUtcDay(new Date(fromMs));
  const b = startOfUtcDay(new Date(toMs));
  return Math.max(0, Math.round((b - a) / MS_DAY));
}

function countInWindow(capsules: Capsule[], nowMs: number, windowDays: number): number {
  const cutoff = nowMs - windowDays * MS_DAY;
  let n = 0;
  for (const c of capsules) {
    const t = parseWatchedAt(c.watched_at);
    if (t != null && t >= cutoff) n += 1;
  }
  return n;
}

function latestCapsule(capsules: Capsule[]): Capsule | null {
  let best: Capsule | null = null;
  let bestMs = -Infinity;
  for (const c of capsules) {
    const t = parseWatchedAt(c.watched_at);
    if (t == null) continue;
    if (t > bestMs) {
      bestMs = t;
      best = c;
    }
  }
  return best;
}

function matchLabel(c: Capsule): string {
  return `${c.home_team_name}–${c.away_team_name}`;
}

/**
 * Digest / recordatorio on-device a partir del diario.
 * Sin Capsules → null (el onboarding core cubre ese caso).
 */
export function computeDiaryDigest(
  capsules: Capsule[],
  now: Date = new Date(),
): DiaryDigest | null {
  if (capsules.length === 0) return null;

  const nowMs = now.getTime();
  const last = latestCapsule(capsules);
  if (!last) return null;

  const lastMs = parseWatchedAt(last.watched_at);
  if (lastMs == null) return null;

  const daysSinceLast = daysBetweenUtc(lastMs, nowMs);
  const recentCount7 = countInWindow(capsules, nowMs, 7);
  const recentCount30 = countInWindow(capsules, nowMs, 30);
  const lastMatchLabel = matchLabel(last);

  if (daysSinceLast >= DIGEST_GAP_MIN_DAYS) {
    return {
      kind: 'gap',
      title: 'Tu diario te espera',
      body: `Llevas ${daysSinceLast} días sin guardar un partido. El último fue ${lastMatchLabel}. Un gesto basta para retomar el hilo.`,
      daysSinceLast,
      recentCount7,
      recentCount30,
      lastMatchLabel,
      href: '/search',
      hrefLabel: 'Buscar partido',
    };
  }

  if (daysSinceLast >= DIGEST_NUDGE_MIN_DAYS) {
    return {
      kind: 'nudge',
      title: 'Vuelve al diario',
      body: `Han pasado ${daysSinceLast} días desde ${lastMatchLabel}. ¿Hay algún partido reciente que quieras guardar?`,
      daysSinceLast,
      recentCount7,
      recentCount30,
      lastMatchLabel,
      href: '/search',
      hrefLabel: 'Añadir Capsule',
    };
  }

  // Activo: resumen semanal ligero
  const weekBit =
    recentCount7 === 0
      ? 'Esta semana aún no has añadido nada nuevo'
      : recentCount7 === 1
        ? 'Esta semana has guardado 1 partido'
        : `Esta semana has guardado ${recentCount7} partidos`;

  const monthBit =
    recentCount30 > recentCount7
      ? ` · ${recentCount30} en los últimos 30 días`
      : '';

  return {
    kind: 'weekly',
    title: 'Resumen de tu diario',
    body: `${weekBit}${monthBit}. Lo más reciente: ${lastMatchLabel}.`,
    daysSinceLast,
    recentCount7,
    recentCount30,
    lastMatchLabel,
    href: '/capsules',
    hrefLabel: 'Ver mis Capsules',
  };
}
