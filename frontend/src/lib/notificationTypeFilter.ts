/** Filtro del centro de alertas por tipo (URL `?type=`). */

export type NotificationTypeFilter = 'like' | 'comment' | 'follow' | 'mention';

export type NotificationListFilter = NotificationTypeFilter | null;

export const NOTIFICATION_TYPE_FILTER_CHIPS: ReadonlyArray<{
  value: NotificationListFilter;
  label: string;
}> = [
  { value: null, label: 'Todas' },
  { value: 'like', label: 'Me gusta' },
  { value: 'comment', label: 'Comentarios' },
  { value: 'mention', label: 'Menciones' },
  { value: 'follow', label: 'Seguidores' },
];

export function parseNotificationTypeParam(value: string | null): NotificationListFilter {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'like' || v === 'comment' || v === 'follow' || v === 'mention') return v;
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
        description: 'Los likes a tus Capsules aparecerán aquí.',
      };
    case 'comment':
      return {
        title: 'Sin comentarios',
        description: 'Los comentarios a tus Capsules aparecerán aquí.',
      };
    case 'mention':
      return {
        title: 'Sin menciones',
        description: 'Las menciones @usuario aparecerán aquí.',
      };
    case 'follow':
      return {
        title: 'Sin seguidores nuevos',
        description: 'Los follows nuevos aparecerán aquí.',
      };
  }
}

/** Título corto para pestaña según filtro activo. */
export function notificationDocumentTitle(type: NotificationListFilter): string {
  if (type === 'like') return 'Notificaciones · Me gusta';
  if (type === 'comment') return 'Notificaciones · Comentarios';
  if (type === 'mention') return 'Notificaciones · Menciones';
  if (type === 'follow') return 'Notificaciones · Seguidores';
  return 'Notificaciones';
}
