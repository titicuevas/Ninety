/** «Tal día como hoy» — lógica compartida con la card on-device del frontend. */

export type DiaryAnniversaryCapsule = {
  id: string;
  watched_at: string;
  home_team_name: string;
  away_team_name: string;
  rating: number | null;
  note: string | null;
};

export type DiaryAnniversary = {
  capsuleId: string;
  yearsAgo: number;
  matchLabel: string;
  watchedAt: string;
  rating: number | null;
  notePreview: string | null;
  extrasCount: number;
  title: string;
  body: string;
  href: string;
};

function parseWatchedYmd(raw: string): { year: number; month: number; day: number } | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    if (!y || !m || !d) return null;
    return { year: y, month: m, day: d };
  }
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function matchLabel(c: DiaryAnniversaryCapsule): string {
  return `${c.home_team_name}–${c.away_team_name}`;
}

function notePreview(note: string | null | undefined, max = 90): string | null {
  if (!note) return null;
  const trimmed = note.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function scoreCandidate(c: DiaryAnniversaryCapsule, yearsAgo: number): number {
  const rating = c.rating ?? 0;
  return yearsAgo * 100 + rating * 10;
}

/**
 * Aniversario del diario para el mes/día local indicado (1-based month/day).
 */
export function computeDiaryAnniversary(
  capsules: DiaryAnniversaryCapsule[],
  today: { year: number; month: number; day: number },
): DiaryAnniversary | null {
  if (capsules.length === 0) return null;

  const candidates: Array<{
    capsule: DiaryAnniversaryCapsule;
    yearsAgo: number;
    watched: { year: number; month: number; day: number };
  }> = [];

  for (const c of capsules) {
    const watched = parseWatchedYmd(c.watched_at);
    if (!watched) continue;
    if (watched.month !== today.month || watched.day !== today.day) continue;
    const yearsAgo = today.year - watched.year;
    if (yearsAgo < 1) continue;
    candidates.push({ capsule: c, yearsAgo, watched });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const scoreDiff = scoreCandidate(b.capsule, b.yearsAgo) - scoreCandidate(a.capsule, a.yearsAgo);
    if (scoreDiff !== 0) return scoreDiff;
    // Más reciente primero (año watched mayor).
    return b.watched.year - a.watched.year;
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
  };
}
