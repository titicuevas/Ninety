/** Fallback de producción legacy (Railway). Preferir VITE_SITE_URL / window.location. */
export const DEFAULT_SITE_URL = 'https://ninety.up.railway.app';

/** URL base del sitio (sin barra final). */
export function siteUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  try {
    const fromEnv = import.meta.env?.VITE_SITE_URL;
    if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.replace(/\/$/, '');
  } catch {
    // Node tests / entornos sin Vite env
  }
  return DEFAULT_SITE_URL;
}

export function publicProfileUrl(username: string): string {
  return `${siteUrl()}/u/${encodeURIComponent(username)}`;
}

/** Cara a cara vs otro aficionado (`/u/:username/vs`). */
export function compareProfileUrl(username: string): string {
  return `${siteUrl()}/u/${encodeURIComponent(username)}/vs`;
}

export function publicCapsuleUrl(capsuleId: string): string {
  return `${siteUrl()}/c/${encodeURIComponent(capsuleId)}`;
}

/** Colección pública (`/u/:username/lists/:slug`). */
export function publicCollectionUrl(username: string, slug: string): string {
  return `${siteUrl()}/u/${encodeURIComponent(username)}/lists/${encodeURIComponent(slug)}`;
}
