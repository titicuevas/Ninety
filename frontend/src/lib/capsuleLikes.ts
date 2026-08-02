/** Tamaño de página al listar quién dio me gusta. */
export const LIKES_PAGE_SIZE = 20;

/** Query string para paginar likes de una Capsule. */
export function buildCapsuleLikesQuery(offset: number, limit = LIKES_PAGE_SIZE): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(Math.max(0, offset)),
  });
  return params.toString();
}

/** Etiqueta corta del contador (botón junto al corazón). */
export function formatLikesCountLabel(count: number): string {
  if (count <= 0) return 'Me gusta';
  return String(count);
}

/** Título del panel / a11y según el total. */
export function formatLikesPanelTitle(total: number): string {
  if (total <= 0) return 'Me gusta';
  if (total === 1) return '1 me gusta';
  return `${total} me gusta`;
}
