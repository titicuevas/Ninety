import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { detectImageMime } from './contentModeration.js';
import { capsulePhotoPathFromUrl } from './capsulePhotoPaths.js';

/** Tope por petición de import (abuso + tiempo de fetch). */
export const DIARY_IMPORT_MAX_PHOTOS_RESTORE = 200;

export const DIARY_PHOTO_FETCH_TIMEOUT_MS = 12_000;
export const DIARY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const MAX_SOURCE_PHOTOS_PER_CAPSULE = 9;
const MAX_REMOTE_REDIRECTS = 3;

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
  lookup?: typeof lookupPublicAddresses;
};

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export function isOwnedCapsulePhotoUrl(url: string, userId: string): boolean {
  const path = capsulePhotoPathFromUrl(url);
  return !!path && path.startsWith(`${userId}/`);
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split('.').map(Number);
    return (
      octets[0] === 0 ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)
    );
  }

  const normalized = address.toLowerCase();
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  );
}

async function lookupPublicAddresses(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses.map(({ address }) => address);
}

async function validateRemotePhotoUrl(
  rawUrl: string,
  resolveAddresses: typeof lookupPublicAddresses,
): Promise<URL | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname) {
    return null;
  }

  try {
    const addresses = await resolveAddresses(parsed.hostname);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return null;
  } catch {
    return null;
  }

  return parsed;
}

export async function fetchRemotePhotoBuffer(
  url: string,
  fetchImpl: typeof fetch = fetch,
  resolveAddresses: typeof lookupPublicAddresses = lookupPublicAddresses,
): Promise<{ buffer: Buffer; mime: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIARY_PHOTO_FETCH_TIMEOUT_MS);

  try {
    let currentUrl = url;
    let res: Response | undefined;
    for (let redirectCount = 0; redirectCount <= MAX_REMOTE_REDIRECTS; redirectCount += 1) {
      const safeUrl = await validateRemotePhotoUrl(currentUrl, resolveAddresses);
      if (!safeUrl) return null;

      res = await fetchImpl(safeUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { Accept: 'image/*' },
      });

      if (res.status < 300 || res.status >= 400) break;
      const location = res.headers.get('location');
      if (!location || redirectCount === MAX_REMOTE_REDIRECTS) return null;
      currentUrl = new URL(location, safeUrl).toString();
    }

    if (!res || !res.ok) return null;

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
