/** Filtro del centro de alertas por tipo (URL `?type=`). */

export type NotificationTypeFilter = 'like' | 'comment' | 'follow';

export type NotificationListFilter = NotificationTypeFilter | null;

export const NOTIFICATION_TYPE_FILTER_CHIPS: ReadonlyArray<{
  value: NotificationListFilter;
  label: string;
}> = [
  { value: null, label: 'Todas' },
  { value: 'like', label: 'Me gusta' },
  { value: 'comment', label: 'Comentarios' },
  { value: 'follow', label: 'Seguidores' },
];

export function parseNotificationTypeParam(value: string | null): NotificationListFilter {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'like' || v === 'comment' || v === 'follow') return v;
  return null;
}

/** Query string; omite default (todas). */
export function notificationTypeSearchParams(type: NotificationListFilter): string {
  if (!type) return '';
  return `?type=${type}`;
}

export function notificationTypePath(type: NotificationListFilter = null): string {
  return `/notifications${notificationTypeSearchParams(type)}`;
}

export function hasNotificationTypeFilter(type: NotificationListFilter): boolean {
  return type != null;
}

export function notificationTypeEmptyCopy(type: NotificationTypeFilter): {
  title: string;
  description: string;
} {
  switch (type) {
    case 'like':
      return {
        title: 'Sin me gusta',
        description: 'Cuando alguien le dé me gusta a tu cápsula, aparecerá aquí.',
      };
    case 'comment':
      return {
        title: 'Sin comentarios',
        description: 'Cuando comenten tu cápsula, lo verás en este filtro.',
      };
    case 'follow':
      return {
        title: 'Sin seguidores nuevos',
        description: 'Cuando alguien te siga, aparecerá en este filtro.',
      };
  }
}

/** Título corto para pestaña según filtro activo. */
export function notificationDocumentTitle(type: NotificationListFilter): string {
  if (type === 'like') return 'Notificaciones · Me gusta';
  if (type === 'comment') return 'Notificaciones · Comentarios';
  if (type === 'follow') return 'Notificaciones · Seguidores';
  return 'Notificaciones';
}
