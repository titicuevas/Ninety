/** Hitos del diario — misma escala que la card on-device del frontend. */

export const DIARY_MILESTONE_THRESHOLDS = [5, 10, 25, 50, 100, 250] as const;

export type DiaryMilestoneThreshold = (typeof DIARY_MILESTONE_THRESHOLDS)[number];

export type DiaryMilestone = {
  threshold: DiaryMilestoneThreshold;
  totalMatches: number;
  title: string;
  body: string;
  href: string;
};

function isThreshold(n: number): n is DiaryMilestoneThreshold {
  return (DIARY_MILESTONE_THRESHOLDS as readonly number[]).includes(n);
}

function copyFor(
  threshold: DiaryMilestoneThreshold,
  total: number,
): Pick<DiaryMilestone, 'title' | 'body'> {
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
 * Hito pendiente más alto alcanzado y aún no marcado en `celebrated`.
 */
export function computeDiaryMilestone(
  totalMatches: number,
  celebrated: readonly number[] = [],
): DiaryMilestone | null {
  if (totalMatches <= 0) return null;

  const celebratedSet = new Set(celebrated.filter(isThreshold));
  let pending: DiaryMilestoneThreshold | null = null;

  for (const threshold of DIARY_MILESTONE_THRESHOLDS) {
    if (totalMatches >= threshold && !celebratedSet.has(threshold)) {
      pending = threshold;
    }
  }

  if (pending == null) return null;

  const { title, body } = copyFor(pending, totalMatches);
  return {
    threshold: pending,
    totalMatches,
    title,
    body,
    href: '/capsules',
  };
}

/** Umbrales ≤ threshold que deben marcarse al celebrar / enviar push. */
export function thresholdsToCelebrate(threshold: number): DiaryMilestoneThreshold[] {
  return DIARY_MILESTONE_THRESHOLDS.filter((t) => t <= threshold);
}
