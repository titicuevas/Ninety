import { useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type PageMetadata = {
  title?: string | null;
  description: string;
  robots?: string;
};

function setMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

/** Mantiene título, descripción y directiva de indexación sincronizados con la ruta SPA. */
export function usePageMetadata({ title, description, robots = 'index, follow' }: PageMetadata) {
  useDocumentTitle(title);

  useEffect(() => {
    setMeta('description', description);
    setMeta('robots', robots);
  }, [description, robots]);
}
