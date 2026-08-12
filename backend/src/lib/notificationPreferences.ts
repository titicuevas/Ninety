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
  /** Opt-in push «Tal día como hoy» (default off). */
  push_anniversary: boolean;
  /** Opt-in push de hitos 5/10/25… (default off). */
  push_milestone: boolean;
  /** Opt-in push «Quiero ir» cuando se acerca un partido (default off). */
  push_want_to_go: boolean;
  /** Opt-in digest email semanal del diario (default off). */
  email_digest: boolean;
  push_quiet: PushQuietHours;
};

export type { PushQuietHours };
export { DEFAULT_PUSH_QUIET_HOURS, normalizePushQuietHours };

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  like: true,
  comment: true,
  follow: true,
  push_anniversary: false,
  push_milestone: false,
  push_want_to_go: false,
  email_digest: false,
  push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS },
};

type PrefsRow = {
  likes_enabled: boolean;
  comments_enabled: boolean;
  follows_enabled: boolean;
  push_anniversary_enabled?: boolean | null;
  push_milestone_enabled?: boolean | null;
  push_want_to_go_enabled?: boolean | null;
  email_digest_enabled?: boolean | null;
  push_quiet_enabled?: boolean | null;
  push_quiet_start?: string | null;
  push_quiet_end?: string | null;
  push_quiet_timezone?: string | null;
};

export function mapNotificationPreferencesRow(
  row: PrefsRow | null | undefined,
): NotificationPreferences {
  if (!row) {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS },
    };
  }
  return {
    like: row.likes_enabled !== false,
    comment: row.comments_enabled !== false,
    follow: row.follows_enabled !== false,
    push_anniversary: row.push_anniversary_enabled === true,
    push_milestone: row.push_milestone_enabled === true,
    push_want_to_go: row.push_want_to_go_enabled === true,
    email_digest: row.email_digest_enabled === true,
    push_quiet: mapPushQuietHoursRow(row),
  };
}

export function isNotificationTypeEnabled(
  prefs: NotificationPreferences,
  type: NotificationType,
): boolean {
  return prefs[type] !== false;
}
