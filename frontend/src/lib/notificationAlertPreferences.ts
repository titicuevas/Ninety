export type NotificationAlertType = 'like' | 'comment' | 'follow';

export type NotificationAlertPreferences = Record<NotificationAlertType, boolean>;

export const DEFAULT_NOTIFICATION_ALERT_PREFERENCES: NotificationAlertPreferences = {
  like: true,
  comment: true,
  follow: true,
};

export const NOTIFICATION_ALERT_TYPE_LABELS: Record<NotificationAlertType, string> = {
  like: 'Me gusta',
  comment: 'Comentarios',
  follow: 'Seguidores',
};

export const NOTIFICATION_ALERT_TYPE_HINTS: Record<NotificationAlertType, string> = {
  like: 'Cuando den me gusta a tus Capsules',
  comment: 'Cuando comenten tus Capsules',
  follow: 'Cuando alguien te siga',
};

export const NOTIFICATION_ALERT_TYPES: NotificationAlertType[] = ['like', 'comment', 'follow'];

export function normalizeNotificationAlertPreferences(
  raw: Partial<NotificationAlertPreferences> | null | undefined,
): NotificationAlertPreferences {
  return {
    like: raw?.like !== false,
    comment: raw?.comment !== false,
    follow: raw?.follow !== false,
  };
}
