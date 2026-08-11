export type NotificationType = 'like' | 'follow' | 'comment';

export type NotificationPreferences = {
  like: boolean;
  comment: boolean;
  follow: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  like: true,
  comment: true,
  follow: true,
};

type PrefsRow = {
  likes_enabled: boolean;
  comments_enabled: boolean;
  follows_enabled: boolean;
};

export function mapNotificationPreferencesRow(
  row: PrefsRow | null | undefined,
): NotificationPreferences {
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return {
    like: row.likes_enabled !== false,
    comment: row.comments_enabled !== false,
    follow: row.follows_enabled !== false,
  };
}

export function isNotificationTypeEnabled(
  prefs: NotificationPreferences,
  type: NotificationType,
): boolean {
  return prefs[type] !== false;
}
