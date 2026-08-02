import type { Capsule } from '@/types/capsule';

export type DiaryAnniversary = {
  capsuleId: string;
  yearsAgo: number;
  matchLabel: string;
  watchedAt: string;
  rating: number | null;
  notePreview: string | null;
  /** Otras Capsules el mismo mes-día (años distintos o mismo año histórico). */
  extrasCount: number;
  title: string;
  body: string;
  href: string;
  hrefLabel: string;
};

function parseDate(raw: string): Date | null {
  // Contrato Capsule: watched_at suele ser YYYY-MM-DD (mediodía local).
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T12:00:00`);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  return new Date(t);
}

function matchLabel(c: Capsule): string {
  return `${c.home_team_name}–${c.away_team_name}`;
}

function notePreview(note: string | null | undefined, max = 90): string | null {
  if (!note) return null;
  const trimmed = note.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function localYmd(d: Date): { year: number; month: number; day: number } {
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

function scoreCandidate(c: Capsule, yearsAgo: number): number {
  const rating = c.rating ?? 0;
  return yearsAgo * 100 + rating * 10;
}

/**
 * «Tal día como hoy»: Capsules cuyo watched_at cae el mismo mes/día
 * en años anteriores (on-device, sin emails).
 */
export function computeDiaryAnniversary(
  capsules: Capsule[],
  now: Date = new Date(),
): DiaryAnniversary | null {
  if (capsules.length === 0) return null;

  const today = localYmd(now);
  const candidates: Array<{ capsule: Capsule; yearsAgo: number; watched: Date }> = [];

  for (const c of capsules) {
    const watched = parseDate(c.watched_at);
    if (!watched) continue;
    const wd = localYmd(watched);
    if (wd.month !== today.month || wd.day !== today.day) continue;
    const yearsAgo = today.year - wd.year;
    if (yearsAgo < 1) continue;
    candidates.push({ capsule: c, yearsAgo, watched });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const scoreDiff = scoreCandidate(b.capsule, b.yearsAgo) - scoreCandidate(a.capsule, a.yearsAgo);
    if (scoreDiff !== 0) return scoreDiff;
    return b.watched.getTime() - a.watched.getTime();
  });

  const best = candidates[0]!;
  const label = matchLabel(best.capsule);
  const yearsLabel = best.yearsAgo === 1 ? '1 año' : `${best.yearsAgo} años`;
  const extrasCount = candidates.length - 1;
  const preview = notePreview(best.capsule.note);
  const ratingBit =
    best.capsule.rating != null ? ` Lo valoraste con ${best.capsule.rating}★.` : '';
  const extrasBit =
    extrasCount === 0
      ? ''
      : extrasCount === 1
        ? ' Hay otra Capsule en este aniversario.'
        : ` Hay ${extrasCount} Capsules más en este aniversario.`;

  return {
    capsuleId: best.capsule.id,
    yearsAgo: best.yearsAgo,
    matchLabel: label,
    watchedAt: best.capsule.watched_at,
    rating: best.capsule.rating ?? null,
    notePreview: preview,
    extrasCount,
    title: 'Tal día como hoy',
    body: `Hace ${yearsLabel} viste ${label}.${ratingBit}${preview ? ` «${preview}»` : ''}${extrasBit}`,
    href: `/c/${best.capsule.id}`,
    hrefLabel: 'Revivir Capsule',
  };
}
