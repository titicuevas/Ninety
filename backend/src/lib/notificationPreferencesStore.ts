import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationTypeEnabled,
  mapNotificationPreferencesRow,
  type NotificationPreferences,
  type NotificationType,
  type PushQuietHours,
} from './notificationPreferences.js';
import {
  DEFAULT_PUSH_QUIET_HOURS,
  normalizePushQuietHours,
} from './notificationQuietHours.js';

export type { NotificationPreferences, NotificationType, PushQuietHours };
export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PUSH_QUIET_HOURS,
  isNotificationTypeEnabled,
  mapNotificationPreferencesRow,
  normalizePushQuietHours,
};

type PrefsRow = {
  likes_enabled: boolean;
  comments_enabled: boolean;
  follows_enabled: boolean;
  push_anniversary_enabled?: boolean | null;
  push_milestone_enabled?: boolean | null;
  push_quiet_enabled?: boolean | null;
  push_quiet_start?: string | null;
  push_quiet_end?: string | null;
  push_quiet_timezone?: string | null;
};

const PREFS_SELECT =
  'likes_enabled, comments_enabled, follows_enabled, push_anniversary_enabled, push_milestone_enabled, push_quiet_enabled, push_quiet_start, push_quiet_end, push_quiet_timezone';
const PREFS_SELECT_QUIET =
  'likes_enabled, comments_enabled, follows_enabled, push_quiet_enabled, push_quiet_start, push_quiet_end, push_quiet_timezone';
const PREFS_SELECT_LEGACY = 'likes_enabled, comments_enabled, follows_enabled';

function isMissingPrefsTable(error: { message?: string; code?: string } | null | undefined): boolean {
  return error?.code === '42P01' || (error?.message ?? '').includes('notification_preferences');
}

function isMissingQuietColumns(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('push_quiet') ||
    ((message.includes('schema cache') || message.includes('Could not find') || message.includes('column')) &&
      message.includes('push_quiet'))
  );
}

function isMissingDiaryPushColumns(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('push_anniversary_enabled') ||
    message.includes('push_milestone_enabled') ||
    ((message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column')) &&
      (message.includes('push_anniversary') || message.includes('push_milestone')))
  );
}

/** Lee preferencias del receptor. Sin fila / sin tabla → todo activado, quiet off. */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };

  const full = await supabaseAdmin
    .from('notification_preferences')
    .select(PREFS_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (full.error) {
    if (isMissingPrefsTable(full.error)) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
    }
    if (isMissingDiaryPushColumns(full.error)) {
      const quietOnly = await supabaseAdmin
        .from('notification_preferences')
        .select(PREFS_SELECT_QUIET)
        .eq('user_id', userId)
        .maybeSingle();
      if (quietOnly.error) {
        if (isMissingQuietColumns(quietOnly.error)) {
          const legacy = await supabaseAdmin
            .from('notification_preferences')
            .select(PREFS_SELECT_LEGACY)
            .eq('user_id', userId)
            .maybeSingle();
          if (legacy.error) {
            return {
              ...DEFAULT_NOTIFICATION_PREFERENCES,
              push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS },
            };
          }
          return mapNotificationPreferencesRow(legacy.data as PrefsRow | null);
        }
        return {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS },
        };
      }
      return mapNotificationPreferencesRow(quietOnly.data as PrefsRow | null);
    }
    if (isMissingQuietColumns(full.error)) {
      const legacy = await supabaseAdmin
        .from('notification_preferences')
        .select(PREFS_SELECT_LEGACY)
        .eq('user_id', userId)
        .maybeSingle();
      if (legacy.error) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
      }
      return mapNotificationPreferencesRow(legacy.data as PrefsRow | null);
    }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
  }

  return mapNotificationPreferencesRow(full.data as PrefsRow | null);
}

export type NotificationPreferencesPatch = Partial<
  Pick<
    NotificationPreferences,
    'like' | 'comment' | 'follow' | 'push_anniversary' | 'push_milestone'
  >
> & {
  push_quiet?: Partial<PushQuietHours>;
};

export async function upsertNotificationPreferences(
  userId: string,
  patch: NotificationPreferencesPatch,
): Promise<NotificationPreferences> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Preferencias no disponibles'), { status: 503 });
  }

  const current = await getNotificationPreferences(userId);
  const nextQuiet = patch.push_quiet
    ? normalizePushQuietHours({ ...current.push_quiet, ...patch.push_quiet })
    : current.push_quiet;

  const next: NotificationPreferences = {
    like: patch.like ?? current.like,
    comment: patch.comment ?? current.comment,
    follow: patch.follow ?? current.follow,
    push_anniversary: patch.push_anniversary ?? current.push_anniversary,
    push_milestone: patch.push_milestone ?? current.push_milestone,
    push_quiet: nextQuiet,
  };

  const payload = {
    user_id: userId,
    likes_enabled: next.like,
    comments_enabled: next.comment,
    follows_enabled: next.follow,
    push_anniversary_enabled: next.push_anniversary,
    push_milestone_enabled: next.push_milestone,
    push_quiet_enabled: next.push_quiet.enabled,
    push_quiet_start: next.push_quiet.start,
    push_quiet_end: next.push_quiet.end,
    push_quiet_timezone: next.push_quiet.timezone,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select(PREFS_SELECT)
    .single();

  if (error) {
    if (isMissingPrefsTable(error)) {
      throw Object.assign(
        new Error('Ejecuta la migración notification_preferences en Supabase.'),
        { status: 503 },
      );
    }
    if (
      isMissingDiaryPushColumns(error) &&
      (patch.push_anniversary !== undefined || patch.push_milestone !== undefined)
    ) {
      throw Object.assign(
        new Error('Ejecuta la migración 20250817120000_diary_push.sql en Supabase.'),
        { status: 503 },
      );
    }
    if (isMissingQuietColumns(error) && patch.push_quiet) {
      throw Object.assign(
        new Error(
          'Ejecuta la migración 20250811180000_notification_push_quiet_hours.sql en Supabase.',
        ),
        { status: 503 },
      );
    }
    if (isMissingDiaryPushColumns(error)) {
      const quietPayload = {
        user_id: userId,
        likes_enabled: next.like,
        comments_enabled: next.comment,
        follows_enabled: next.follow,
        push_quiet_enabled: next.push_quiet.enabled,
        push_quiet_start: next.push_quiet.start,
        push_quiet_end: next.push_quiet.end,
        push_quiet_timezone: next.push_quiet.timezone,
        updated_at: new Date().toISOString(),
      };
      const quiet = await supabaseAdmin
        .from('notification_preferences')
        .upsert(quietPayload, { onConflict: 'user_id' })
        .select(PREFS_SELECT_QUIET)
        .single();
      if (quiet.error) {
        if (isMissingQuietColumns(quiet.error)) {
          const legacyPayload = {
            user_id: userId,
            likes_enabled: next.like,
            comments_enabled: next.comment,
            follows_enabled: next.follow,
            updated_at: new Date().toISOString(),
          };
          const legacy = await supabaseAdmin
            .from('notification_preferences')
            .upsert(legacyPayload, { onConflict: 'user_id' })
            .select(PREFS_SELECT_LEGACY)
            .single();
          if (legacy.error) throw legacy.error;
          return mapNotificationPreferencesRow(legacy.data as PrefsRow);
        }
        throw quiet.error;
      }
      return mapNotificationPreferencesRow(quiet.data as PrefsRow);
    }
    if (isMissingQuietColumns(error)) {
      const legacyPayload = {
        user_id: userId,
        likes_enabled: next.like,
        comments_enabled: next.comment,
        follows_enabled: next.follow,
        updated_at: new Date().toISOString(),
      };
      const legacy = await supabaseAdmin
        .from('notification_preferences')
        .upsert(legacyPayload, { onConflict: 'user_id' })
        .select(PREFS_SELECT_LEGACY)
        .single();
      if (legacy.error) throw legacy.error;
      return mapNotificationPreferencesRow(legacy.data as PrefsRow);
    }
    throw error;
  }

  return mapNotificationPreferencesRow(data as PrefsRow);
}
