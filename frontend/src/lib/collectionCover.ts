/** Resolución pura de la URL de portada de una colección (espejo del backend). */

export type CapsuleCoverSource = {
  id: string;
  photo_urls?: string[] | null;
  photo_url?: string | null;
};

function firstPhotoUrl(capsule: CapsuleCoverSource | null | undefined): string | null {
  if (!capsule) return null;
  const urls = Array.isArray(capsule.photo_urls) ? capsule.photo_urls : [];
  for (const url of urls) {
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  if (typeof capsule.photo_url === 'string' && capsule.photo_url.trim()) {
    return capsule.photo_url.trim();
  }
  return null;
}

/**
 * Preferencia: Capsule destacada (`coverCapsuleId`) si tiene foto;
 * si no, primera Capsule (en orden) con foto; si ninguna, `null`.
 */
export function resolveCollectionCoverUrl(options: {
  coverCapsuleId?: string | null;
  capsules: CapsuleCoverSource[];
}): string | null {
  const { coverCapsuleId, capsules } = options;
  if (coverCapsuleId) {
    const featured = capsules.find((c) => c.id === coverCapsuleId);
    const featuredUrl = firstPhotoUrl(featured);
    if (featuredUrl) return featuredUrl;
  }

  for (const capsule of capsules) {
    const url = firstPhotoUrl(capsule);
    if (url) return url;
  }

  return null;
}
