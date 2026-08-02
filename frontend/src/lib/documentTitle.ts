export const DEFAULT_DOCUMENT_TITLE = 'Ninety — Tu diario futbolero';

/** Título de pestaña: «Página · Ninety» o el default de marketing. */
export function formatDocumentTitle(page?: string | null): string {
  const trimmed = page?.trim();
  if (!trimmed) return DEFAULT_DOCUMENT_TITLE;
  return `${trimmed} · Ninety`;
}
