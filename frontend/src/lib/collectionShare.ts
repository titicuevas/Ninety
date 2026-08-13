import { publicCollectionUrl } from '@/lib/siteUrl';

export type CollectionShareSummary = {
  name: string;
  username: string;
  slug: string;
  description?: string | null;
  authorDisplayName?: string | null;
  itemsCount?: number | null;
  likesCount?: number | null;
};

/**
 * Texto listo para copiar/compartir una colección pública (one-tap).
 * Resume nombre, dueño, partidos, likes + enlace a la lista.
 */
export function buildCollectionShareText(summary: CollectionShareSummary): string {
  const name = summary.name.trim() || 'Colección';
  const username = summary.username.trim();
  const slug = summary.slug.trim();
  const url =
    username && slug ? publicCollectionUrl(username, slug) : '';

  const author =
    summary.authorDisplayName?.trim() || (username ? `@${username}` : null);

  const lines = [`📋 ${name} · Ninety`];
  if (author) lines.push(`Lista de ${author}`);

  const details: string[] = [];
  const items = summary.itemsCount ?? 0;
  if (items > 0) {
    details.push(`${items} partido${items === 1 ? '' : 's'}`);
  }

  const likes = summary.likesCount ?? 0;
  if (likes > 0) {
    details.push(`${likes} me gusta`);
  }

  const description = summary.description?.trim();
  if (description) {
    details.push(
      description.length > 120 ? `${description.slice(0, 119).trimEnd()}…` : description,
    );
  }

  if (details.length > 0) {
    lines.push('', ...details);
  }

  if (url) lines.push('', url);
  return lines.join('\n');
}
