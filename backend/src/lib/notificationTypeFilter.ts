/** Filtro de listado del centro de alertas por tipo (like / comment / follow). */

export type NotificationTypeFilter = 'like' | 'comment' | 'follow';

const ALLOWED = new Set<NotificationTypeFilter>(['like', 'comment', 'follow']);

/** `type` de query; inválido o vacío → sin filtro. */
export function parseNotificationTypeFilter(raw: unknown): NotificationTypeFilter | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (ALLOWED.has(v as NotificationTypeFilter)) return v as NotificationTypeFilter;
  return null;
}
