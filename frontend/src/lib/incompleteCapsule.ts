import type { Capsule } from '@/types/capsule';

export type IncompleteCapsuleNudge = {
  capsuleId: string;
  homeTeam: string;
  awayTeam: string;
  missingNote: boolean;
  missingPhotos: boolean;
  href: string;
  title: string;
  body: string;
  hrefLabel: string;
};

function hasNote(capsule: Capsule): boolean {
  return Boolean(capsule.note?.trim());
}

function hasPhotos(capsule: Capsule): boolean {
  return (capsule.photo_urls?.length ?? 0) > 0 || Boolean(capsule.photo_url);
}

/**
 * Capsule con valoración pero sin nota ni fotos — candidata al soft nudge.
 * Prioriza la más reciente por `watched_at` / `updated_at`.
 */
export function findIncompleteCapsule(
  capsules: Capsule[],
  skippedIds: readonly string[] = [],
): IncompleteCapsuleNudge | null {
  const skipped = new Set(skippedIds.filter(Boolean));
  const candidates = capsules
    .filter((c) => c.rating != null && !hasNote(c) && !hasPhotos(c) && !skipped.has(c.id))
    .sort((a, b) => {
      const aw = Date.parse(a.watched_at) || Date.parse(a.updated_at) || 0;
      const bw = Date.parse(b.watched_at) || Date.parse(b.updated_at) || 0;
      return bw - aw;
    });

  const capsule = candidates[0];
  if (!capsule) return null;

  return {
    capsuleId: capsule.id,
    homeTeam: capsule.home_team_name,
    awayTeam: capsule.away_team_name,
    missingNote: true,
    missingPhotos: true,
    href: `/capsules/${capsule.id}/edit`,
    title: 'Completa tu Capsule',
    body: `${capsule.home_team_name} vs ${capsule.away_team_name} tiene ★ pero aún sin nota ni fotos. Añade un detalle y el recuerdo gana vida.`,
    hrefLabel: 'Completar',
  };
}
