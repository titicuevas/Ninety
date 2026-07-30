export const CAPSULE_PHOTOS_BUCKET = 'capsule-photos';

/** Extrae el path relativo del bucket desde una URL pública de foto. */
export function capsulePhotoPathFromUrl(photoUrl: string): string | null {
  const marker = `/storage/v1/object/public/${CAPSULE_PHOTOS_BUCKET}/`;
  const index = photoUrl.indexOf(marker);
  if (index === -1) return null;
  const path = decodeURIComponent(photoUrl.slice(index + marker.length).split('?')[0] ?? '');
  return path || null;
}
