/** URL base del sitio (sin barra final). */
export function siteUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL ?? 'https://ninety.up.railway.app';
}

export function publicProfileUrl(username: string): string {
  return `${siteUrl()}/u/${encodeURIComponent(username)}`;
}

export function publicCapsuleUrl(capsuleId: string): string {
  return `${siteUrl()}/c/${encodeURIComponent(capsuleId)}`;
}
