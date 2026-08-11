import {
  DEFAULT_PUSH_QUIET_HOURS,
  mapPushQuietHoursRow,
  normalizePushQuietHours,
  type PushQuietHours,
} from './notificationQuietHours.js';

export type NotificationType = 'like' | 'follow' | 'comment';

export type NotificationPreferences = {
  like: boolean;
  comment: boolean;
  follow: boolean;
  push_quiet: PushQuietHours;
};

export type { PushQuietHours };
export { DEFAULT_PUSH_QUIET_HOURS, normalizePushQuietHours };

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  like: true,
  comment: true,
  follow: true,
  push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS },
};

type PrefsRow = {
  likes_enabled: boolean;
  comments_enabled: boolean;
  follows_enabled: boolean;
  push_quiet_enabled?: boolean | null;
  push_quiet_start?: string | null;
  push_quiet_end?: string | null;
  push_quiet_timezone?: string | null;
};

export function mapNotificationPreferencesRow(
  row: PrefsRow | null | undefined,
): NotificationPreferences {
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
  return {
    like: row.likes_enabled !== false,
    comment: row.comments_enabled !== false,
    follow: row.follows_enabled !== false,
    push_quiet: mapPushQuietHoursRow(row),
  };
}

export function isNotificationTypeEnabled(
  prefs: NotificationPreferences,
  type: NotificationType,
): boolean {
  return prefs[type] !== false;
}
