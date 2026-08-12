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
import type { SupabaseClient } from '@supabase/supabase-js';

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
  push_want_to_go_enabled?: boolean | null;
  email_digest_enabled?: boolean | null;
  push_quiet_enabled?: boolean | null;
  push_quiet_start?: string | null;
  push_quiet_end?: string | null;
  push_quiet_timezone?: string | null;
};

const PREFS_SELECT =
  'likes_enabled, comments_enabled, follows_enabled, push_anniversary_enabled, push_milestone_enabled, push_want_to_go_enabled, email_digest_enabled, push_quiet_enabled, push_quiet_start, push_quiet_end, push_quiet_timezone';
const PREFS_SELECT_EMAIL =
  'likes_enabled, comments_enabled, follows_enabled, push_anniversary_enabled, push_milestone_enabled, email_digest_enabled, push_quiet_enabled, push_quiet_start, push_quiet_end, push_quiet_timezone';
const PREFS_SELECT_DIARY =
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

function isMissingEmailDigestColumn(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('email_digest_enabled') ||
    ((message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column')) &&
      message.includes('email_digest'))
  );
}

function isMissingWantToGoPushColumn(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('push_want_to_go_enabled') ||
    ((message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column')) &&
      message.includes('push_want_to_go'))
  );
}

/** Lee preferencias del receptor. Sin fila / sin tabla → todo activado, quiet off, digest email off. */
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
    if (isMissingWantToGoPushColumn(full.error)) {
      return getPrefsWithoutWantToGo(supabaseAdmin, userId);
    }
    if (isMissingEmailDigestColumn(full.error)) {
      const diary = await supabaseAdmin
        .from('notification_preferences')
        .select(PREFS_SELECT_DIARY)
        .eq('user_id', userId)
        .maybeSingle();
      if (diary.error) {
        if (isMissingDiaryPushColumns(diary.error)) {
          return getPrefsWithoutDiary(supabaseAdmin, userId);
        }
        if (isMissingQuietColumns(diary.error)) {
          return getPrefsLegacy(supabaseAdmin, userId);
        }
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
      }
      return mapNotificationPreferencesRow(diary.data as PrefsRow | null);
    }
    if (isMissingDiaryPushColumns(full.error)) {
      return getPrefsWithoutDiary(supabaseAdmin, userId);
    }
    if (isMissingQuietColumns(full.error)) {
      return getPrefsLegacy(supabaseAdmin, userId);
    }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
  }

  return mapNotificationPreferencesRow(full.data as PrefsRow | null);
}

async function getPrefsWithoutWantToGo(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<NotificationPreferences> {
  const emailOnly = await supabaseAdmin
    .from('notification_preferences')
    .select(PREFS_SELECT_EMAIL)
    .eq('user_id', userId)
    .maybeSingle();
  if (emailOnly.error) {
    if (isMissingEmailDigestColumn(emailOnly.error)) {
      const diary = await supabaseAdmin
        .from('notification_preferences')
        .select(PREFS_SELECT_DIARY)
        .eq('user_id', userId)
        .maybeSingle();
      if (diary.error) {
        if (isMissingDiaryPushColumns(diary.error)) {
          return getPrefsWithoutDiary(supabaseAdmin, userId);
        }
        if (isMissingQuietColumns(diary.error)) {
          return getPrefsLegacy(supabaseAdmin, userId);
        }
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
      }
      return mapNotificationPreferencesRow(diary.data as PrefsRow | null);
    }
    if (isMissingDiaryPushColumns(emailOnly.error)) {
      return getPrefsWithoutDiary(supabaseAdmin, userId);
    }
    if (isMissingQuietColumns(emailOnly.error)) {
      return getPrefsLegacy(supabaseAdmin, userId);
    }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
  }
  return mapNotificationPreferencesRow(emailOnly.data as PrefsRow | null);
}

async function getPrefsWithoutDiary(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<NotificationPreferences> {
  const quietOnly = await supabaseAdmin
    .from('notification_preferences')
    .select(PREFS_SELECT_QUIET)
    .eq('user_id', userId)
    .maybeSingle();
  if (quietOnly.error) {
    if (isMissingQuietColumns(quietOnly.error)) {
      return getPrefsLegacy(supabaseAdmin, userId);
    }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, push_quiet: { ...DEFAULT_PUSH_QUIET_HOURS } };
  }
  return mapNotificationPreferencesRow(quietOnly.data as PrefsRow | null);
}

async function getPrefsLegacy(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<NotificationPreferences> {
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

export type NotificationPreferencesPatch = Partial<
  Pick<
    NotificationPreferences,
    | 'like'
    | 'comment'
    | 'follow'
    | 'push_anniversary'
    | 'push_milestone'
    | 'push_want_to_go'
    | 'email_digest'
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
    push_want_to_go: patch.push_want_to_go ?? current.push_want_to_go,
    email_digest: patch.email_digest ?? current.email_digest,
    push_quiet: nextQuiet,
  };

  const payload = {
    user_id: userId,
    likes_enabled: next.like,
    comments_enabled: next.comment,
    follows_enabled: next.follow,
    push_anniversary_enabled: next.push_anniversary,
    push_milestone_enabled: next.push_milestone,
    push_want_to_go_enabled: next.push_want_to_go,
    email_digest_enabled: next.email_digest,
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
    if (isMissingWantToGoPushColumn(error) && patch.push_want_to_go !== undefined) {
      throw Object.assign(
        new Error('Ejecuta la migración 20250819120000_want_to_go_push.sql en Supabase.'),
        { status: 503 },
      );
    }
    if (isMissingEmailDigestColumn(error) && patch.email_digest !== undefined) {
      throw Object.assign(
        new Error('Ejecuta la migración 20250818120000_email_digest.sql en Supabase.'),
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
    if (isMissingWantToGoPushColumn(error)) {
      const emailPayload = {
        user_id: userId,
        likes_enabled: next.like,
        comments_enabled: next.comment,
        follows_enabled: next.follow,
        push_anniversary_enabled: next.push_anniversary,
        push_milestone_enabled: next.push_milestone,
        email_digest_enabled: next.email_digest,
        push_quiet_enabled: next.push_quiet.enabled,
        push_quiet_start: next.push_quiet.start,
        push_quiet_end: next.push_quiet.end,
        push_quiet_timezone: next.push_quiet.timezone,
        updated_at: new Date().toISOString(),
      };
      const emailRow = await supabaseAdmin
        .from('notification_preferences')
        .upsert(emailPayload, { onConflict: 'user_id' })
        .select(PREFS_SELECT_EMAIL)
        .single();
      if (emailRow.error) {
        if (isMissingEmailDigestColumn(emailRow.error)) {
          // fall through to email-missing path below by reusing diary upsert
        } else {
          throw emailRow.error;
        }
      } else {
        return mapNotificationPreferencesRow(emailRow.data as PrefsRow);
      }
    }
    if (isMissingEmailDigestColumn(error) || isMissingWantToGoPushColumn(error)) {
      const diaryPayload = {
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
      const diary = await supabaseAdmin
        .from('notification_preferences')
        .upsert(diaryPayload, { onConflict: 'user_id' })
        .select(PREFS_SELECT_DIARY)
        .single();
      if (diary.error) {
        if (isMissingDiaryPushColumns(diary.error)) {
          return upsertWithoutDiary(supabaseAdmin, userId, next, patch);
        }
        throw diary.error;
      }
      return mapNotificationPreferencesRow(diary.data as PrefsRow);
    }
    if (isMissingDiaryPushColumns(error)) {
      return upsertWithoutDiary(supabaseAdmin, userId, next, patch);
    }
    if (isMissingQuietColumns(error)) {
      return upsertLegacy(supabaseAdmin, userId, next);
    }
    throw error;
  }

  return mapNotificationPreferencesRow(data as PrefsRow);
}

async function upsertWithoutDiary(
  supabaseAdmin: SupabaseClient,
  userId: string,
  next: NotificationPreferences,
  patch: NotificationPreferencesPatch,
): Promise<NotificationPreferences> {
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
      return upsertLegacy(supabaseAdmin, userId, next);
    }
    throw quiet.error;
  }
  if (patch.push_anniversary !== undefined || patch.push_milestone !== undefined) {
    throw Object.assign(
      new Error('Ejecuta la migración 20250817120000_diary_push.sql en Supabase.'),
      { status: 503 },
    );
  }
  return mapNotificationPreferencesRow(quiet.data as PrefsRow);
}

async function upsertLegacy(
  supabaseAdmin: SupabaseClient,
  userId: string,
  next: NotificationPreferences,
): Promise<NotificationPreferences> {
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
