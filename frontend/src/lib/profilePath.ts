import { isAutoUsername } from '@/lib/profileHelpers';

export function profilePath(username: string) {
  return `/u/${encodeURIComponent(username)}`;
}

/** Ruta pública solo si hay slug real (no auto/null). */
export function publicProfilePath(username?: string | null): string | null {
  if (!username || isAutoUsername(username)) return null;
  return profilePath(username);
}
