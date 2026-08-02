import { useEffect } from 'react';
import { formatDocumentTitle } from '@/lib/documentTitle';

/** Actualiza `document.title` para pestañas, historial y lectores de pantalla. */
export function useDocumentTitle(page?: string | null) {
  useEffect(() => {
    document.title = formatDocumentTitle(page);
  }, [page]);
}
