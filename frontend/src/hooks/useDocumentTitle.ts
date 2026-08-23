import { useEffect } from 'react';
import { formatDocumentTitle } from '@/lib/documentTitle';

const DEFAULT_DESCRIPTION =
  'Guarda, valora y revive los partidos que ves con tu diario futbolero en Ninety.';

function isIndexablePath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/privacidad' ||
    pathname === '/terminos' ||
    pathname.startsWith('/u/') ||
    pathname.startsWith('/c/')
  );
}

function upsertMeta(name: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/** Actualiza `document.title` para pestañas, historial y lectores de pantalla. */
export function useDocumentTitle(page?: string | null) {
  useEffect(() => {
    document.title = formatDocumentTitle(page);
    const label = page?.trim();
    upsertMeta(
      'description',
      label ? `${label} en Ninety. ${DEFAULT_DESCRIPTION}` : DEFAULT_DESCRIPTION,
    );
    upsertMeta('robots', isIndexablePath(window.location.pathname) ? 'index, follow' : 'noindex, follow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${window.location.pathname}`;
  }, [page]);
}
