/** URL base del sitio (sin barra final). */
export function siteOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL ?? 'https://ninety.up.railway.app';
}

export function publicProfileUrl(username: string): string {
  return `${siteOrigin()}/u/${encodeURIComponent(username)}`;
}
