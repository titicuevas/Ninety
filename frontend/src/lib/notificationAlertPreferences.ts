export type NotificationAlertType = 'like' | 'comment' | 'follow';

export type PushQuietHours = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
};

export type NotificationAlertPreferences = Record<NotificationAlertType, boolean> & {
  /** Opt-in push «Tal día como hoy» (default off). */
  push_anniversary: boolean;
  /** Opt-in push de hitos del diario (default off). */
  push_milestone: boolean;
  /** Opt-in push Quiero ir cuando se acerca un partido (default off). */
  push_want_to_go: boolean;
  /** Opt-in digest email semanal del diario (default off). */
  email_digest: boolean;
  push_quiet: PushQuietHours;
};

export const DEFAULT_PUSH_QUIET_HOURS: PushQuietHours = {
  enabled: false,
  start: '22:00',
  end: '08:00',
  timezone: 'UTC',
};

export const DEFAULT_NOTIFICATION_ALERT_PREFERENCES: NotificationAlertPreferences = {
  like: true,
  comment: true,
  follow: true,
  push_anniversary: false,
  push_milestone: false,
  push_want_to_go: false,
  email_digest: false,
  push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS },
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

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidQuietHhMm(value: string): boolean {
  return HH_MM.test(value.trim());
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function normalizePushQuietHours(
  raw: Partial<PushQuietHours> | null | undefined,
): PushQuietHours {
  const start =
    typeof raw?.start === 'string' && isValidQuietHhMm(raw.start)
      ? raw.start.trim()
      : DEFAULT_PUSH_QUIET_HOURS.start;
  const end =
    typeof raw?.end === 'string' && isValidQuietHhMm(raw.end)
      ? raw.end.trim()
      : DEFAULT_PUSH_QUIET_HOURS.end;
  const timezone =
    typeof raw?.timezone === 'string' && raw.timezone.trim().length > 0
      ? raw.timezone.trim()
      : DEFAULT_PUSH_QUIET_HOURS.timezone;

  return {
    enabled: raw?.enabled === true,
    start,
    end,
    timezone,
  };
}

export function normalizeNotificationAlertPreferences(
  raw: Partial<NotificationAlertPreferences> | null | undefined,
): NotificationAlertPreferences {
  return {
    like: raw?.like !== false,
    comment: raw?.comment !== false,
    follow: raw?.follow !== false,
    push_anniversary: raw?.push_anniversary === true,
    push_milestone: raw?.push_milestone === true,
    push_want_to_go: raw?.push_want_to_go === true,
    email_digest: raw?.email_digest === true,
    push_quiet: normalizePushQuietHours(raw?.push_quiet),
  };
}

export type NotificationAlertPreferencesPatch = Partial<
  Pick<
    NotificationAlertPreferences,
    | NotificationAlertType
    | 'push_anniversary'
    | 'push_milestone'
    | 'push_want_to_go'
    | 'email_digest'
  >
> & {
  push_quiet?: Partial<PushQuietHours>;
};
