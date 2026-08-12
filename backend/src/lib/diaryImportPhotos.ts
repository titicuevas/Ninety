import { detectImageMime } from './contentModeration.js';
import { capsulePhotoPathFromUrl } from './capsulePhotoPaths.js';

/** Tope por petición de import (abuso + tiempo de fetch). */
export const DIARY_IMPORT_MAX_PHOTOS_RESTORE = 200;

export const DIARY_PHOTO_FETCH_TIMEOUT_MS = 12_000;
export const DIARY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const MAX_SOURCE_PHOTOS_PER_CAPSULE = 9;

export type PhotoRestoreSummary = {
  photos_restored: number;
  photos_failed: number;
  photos_skipped_limit: number;
  capsules_with_photos: number;
};

export type CapsulePhotoRestoreInput = {
  capsuleId: string;
  sourceUrls: string[];
};

export type UploadCapsulePhoto = (
  userId: string,
  buffer: Buffer,
  mimeType: string,
) => Promise<string>;

export type RestorePhotoDeps = {
  fetchRemote?: typeof fetchRemotePhotoBuffer;
  upload?: UploadCapsulePhoto;
  maxPhotos?: number;
};

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export function isOwnedCapsulePhotoUrl(url: string, userId: string): boolean {
  const path = capsulePhotoPathFromUrl(url);
  return !!path && path.startsWith(`${userId}/`);
}

export async function fetchRemotePhotoBuffer(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ buffer: Buffer; mime: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIARY_PHOTO_FETCH_TIMEOUT_MS);

  try {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'image/*' },
    });

    if (!res.ok) return null;

    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > DIARY_PHOTO_MAX_BYTES) return null;

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > DIARY_PHOTO_MAX_BYTES) return null;

    const buffer = Buffer.from(arrayBuffer);
    const mime = detectImageMime(buffer);
    if (!mime || !ALLOWED_IMAGE_MIMES.has(mime)) return null;

    return { buffer, mime };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function restoreSinglePhotoUrl(
  url: string,
  userId: string,
  deps: RestorePhotoDeps = {},
): Promise<string | null> {
  if (isOwnedCapsulePhotoUrl(url, userId)) {
    return url;
  }

  const fetchRemote = deps.fetchRemote ?? fetchRemotePhotoBuffer;
  const upload =
    deps.upload ??
    (await import('./ensureStorage.js')).uploadCapsulePhotoBuffer;

  const fetched = await fetchRemote(url);
  if (!fetched) return null;

  try {
    return await upload(userId, fetched.buffer, fetched.mime);
  } catch {
    return null;
  }
}

/** Re-sube fotos remotas del export; fallos no bloquean el import. */
export async function restorePhotosForCapsules(
  capsules: CapsulePhotoRestoreInput[],
  userId: string,
  deps: RestorePhotoDeps = {},
): Promise<{ byCapsuleId: Map<string, string[]>; summary: PhotoRestoreSummary }> {
  const maxPhotos = deps.maxPhotos ?? DIARY_IMPORT_MAX_PHOTOS_RESTORE;
  const byCapsuleId = new Map<string, string[]>();

  const summary: PhotoRestoreSummary = {
    photos_restored: 0,
    photos_failed: 0,
    photos_skipped_limit: 0,
    capsules_with_photos: 0,
  };

  let budget = maxPhotos;

  for (const capsule of capsules) {
    if (capsule.sourceUrls.length === 0) continue;

    summary.capsules_with_photos += 1;
    const restored: string[] = [];

    for (const sourceUrl of capsule.sourceUrls) {
      if (budget <= 0) {
        summary.photos_skipped_limit += 1;
        continue;
      }

      budget -= 1;
      const url = await restoreSinglePhotoUrl(sourceUrl, userId, deps);
      if (url) {
        restored.push(url);
        summary.photos_restored += 1;
      } else {
        summary.photos_failed += 1;
      }
    }

    if (restored.length > 0) {
      byCapsuleId.set(capsule.capsuleId, restored);
    }
  }

  return { byCapsuleId, summary };
}
