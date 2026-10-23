import type { Locale } from '@/lib/i18n/types';

const STORAGE_KEY = 'ninety.locale.v1';

export function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'es' || raw === 'en') return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore quota */
  }
}

/** Preferencia guardada → idioma del navegador → español. */
export function detectInitialLocale(): Locale {
  const stored = readStoredLocale();
  if (stored) return stored;
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase();
    if (lang.startsWith('en')) return 'en';
  }
  return 'es';
}
