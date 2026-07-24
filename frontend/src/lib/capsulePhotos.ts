export const MAX_CAPSULE_PHOTOS = 9;

export function getCapsulePhotoUrls(capsule: {
  photo_urls?: string[] | null;
  photo_url?: string | null;
}): string[] {
  if (capsule.photo_urls?.length) return capsule.photo_urls;
  if (capsule.photo_url) return [capsule.photo_url];
  return [];
}
