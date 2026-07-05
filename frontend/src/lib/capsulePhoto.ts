import { apiFetch, apiUpload } from '@/lib/api';
import { MAX_CAPSULE_PHOTOS } from '@/lib/capsulePhotos';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateCapsulePhoto(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Solo JPG, PNG o WebP.';
  }
  if (file.size > MAX_BYTES) {
    return 'La foto no puede superar 5 MB.';
  }
  return null;
}

export function validateCapsulePhotoBatch(files: File[], existingCount = 0): string | null {
  if (existingCount + files.length > MAX_CAPSULE_PHOTOS) {
    return `Máximo ${MAX_CAPSULE_PHOTOS} fotos por Capsule.`;
  }
  for (const file of files) {
    const error = validateCapsulePhoto(file);
    if (error) return error;
  }
  return null;
}

export async function uploadCapsulePhotos(files: File[], accessToken: string) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }

  const { urls } = await apiUpload<{ urls: string[] }>('/api/capsules/photos', formData, accessToken);
  return urls;
}

export async function deleteCapsulePhotoByUrl(photoUrl: string, accessToken: string) {
  await apiFetch('/api/capsules/photos', {
    method: 'DELETE',
    body: JSON.stringify({ url: photoUrl }),
  }, accessToken);
}

export async function deleteCapsulePhotosByUrls(photoUrls: string[], accessToken: string) {
  await Promise.all(photoUrls.map((url) => deleteCapsulePhotoByUrl(url, accessToken).catch(() => undefined)));
}
