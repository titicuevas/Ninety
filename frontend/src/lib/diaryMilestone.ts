import type { Capsule } from '@/types/capsule';

/** Umbrales de celebración del diario (activación / retención). */
const DIARY_MILESTONE_THRESHOLDS = [5, 10, 25, 50, 100, 250] as const;

export type DiaryMilestoneThreshold = (typeof DIARY_MILESTONE_THRESHOLDS)[number];

export type DiaryMilestone = {
  threshold: DiaryMilestoneThreshold;
  totalMatches: number;
  title: string;
  body: string;
  href: string;
  hrefLabel: string;
};

function isThreshold(n: number): n is DiaryMilestoneThreshold {
  return (DIARY_MILESTONE_THRESHOLDS as readonly number[]).includes(n);
}

function copyFor(threshold: DiaryMilestoneThreshold, total: number): Pick<DiaryMilestone, 'title' | 'body'> {
  switch (threshold) {
    case 5:
      return {
        title: 'Primeras 5 Capsules',
        body: `Tu diario ya tiene forma: ${total} partidos guardados. Sigue construyendo tu historia futbolera.`,
      };
    case 10:
      return {
        title: '10 partidos en el diario',
        body: `Ya van ${total}. Cada Capsule suma a tu Wrapped y a los recuerdos que podrás revivir.`,
      };
    case 25:
      return {
        title: '25 Capsules',
        body: `Un cuarto de centenar de partidos vividos. Tu diario empieza a contar una temporada entera.`,
      };
    case 50:
      return {
        title: '50 partidos vividos',
        body: `Medio centenar en Ninety. Eres de los que no dejan pasar un partido sin guardarlo.`,
      };
    case 100:
      return {
        title: '100 Capsules',
        body: `Un centenar de partidos en tu diario. Eso ya es una historia digna de compartir.`,
      };
    case 250:
      return {
        title: 'Leyenda del diario',
        body: `${total} partidos guardados. Pocos diarios llegan tan lejos — sigue sumando.`,
      };
  }
}

/**
 * Hito pendiente más alto alcanzado y aún no celebrado (on-device).
 * Si el diario salta varios umbrales, se celebra el mayor; al marcar se
 * consideran celebrados todos los ≤ umbral.
 */
export function computeDiaryMilestone(
  capsules: Capsule[],
  celebrated: readonly number[] = [],
): DiaryMilestone | null {
  const total = capsules.length;
  if (total === 0) return null;

  const celebratedSet = new Set(celebrated.filter(isThreshold));
  let pending: DiaryMilestoneThreshold | null = null;

  for (const threshold of DIARY_MILESTONE_THRESHOLDS) {
    if (total >= threshold && !celebratedSet.has(threshold)) {
      pending = threshold;
    }
  }

  if (pending == null) return null;

  const { title, body } = copyFor(pending, total);
  return {
    threshold: pending,
    totalMatches: total,
    title,
    body,
    href: '/capsules',
    hrefLabel: 'Ver mi diario',
  };
}

/** Umbrales ≤ threshold que deben marcarse al celebrar. */
export function thresholdsToCelebrate(threshold: number): DiaryMilestoneThreshold[] {
  return DIARY_MILESTONE_THRESHOLDS.filter((t) => t <= threshold);
}
