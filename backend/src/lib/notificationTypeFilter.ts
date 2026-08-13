/** Filtro de listado del centro de alertas por tipo (like / comment / follow / mention). */

export type NotificationTypeFilter = 'like' | 'comment' | 'follow' | 'mention';

const ALLOWED = new Set<NotificationTypeFilter>(['like', 'comment', 'follow', 'mention']);

/** `type` de query; inválido o vacío → sin filtro. */
export function parseNotificationTypeFilter(raw: unknown): NotificationTypeFilter | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (ALLOWED.has(v as NotificationTypeFilter)) return v as NotificationTypeFilter;
  return null;
}

/** Tipos DB a incluir cuando el usuario filtra por chip (like incluye collection_like). */
export function notificationDbTypesForFilter(
  filter: NotificationTypeFilter,
): string[] {
  if (filter === 'like') return ['like', 'collection_like'];
  return [filter];
}
