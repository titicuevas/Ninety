import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationTypeEnabled,
  mapNotificationPreferencesRow,
  type NotificationPreferences,
  type NotificationType,
} from './notificationPreferences.js';

export type { NotificationPreferences, NotificationType };
export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationTypeEnabled,
  mapNotificationPreferencesRow,
};

type PrefsRow = {
  likes_enabled: boolean;
  comments_enabled: boolean;
  follows_enabled: boolean;
};

function isMissingPrefsTable(error: { message?: string; code?: string } | null | undefined): boolean {
  return error?.code === '42P01' || (error?.message ?? '').includes('notification_preferences');
}

/** Lee preferencias del receptor. Sin fila / sin tabla → todo activado. */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('likes_enabled, comments_enabled, follows_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingPrefsTable(error)) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  return mapNotificationPreferencesRow(data as PrefsRow | null);
}

export async function upsertNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Preferencias no disponibles'), { status: 503 });
  }

  const current = await getNotificationPreferences(userId);
  const next: NotificationPreferences = {
    like: patch.like ?? current.like,
    comment: patch.comment ?? current.comment,
    follow: patch.follow ?? current.follow,
  };

  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        likes_enabled: next.like,
        comments_enabled: next.comment,
        follows_enabled: next.follow,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('likes_enabled, comments_enabled, follows_enabled')
    .single();

  if (error) {
    if (isMissingPrefsTable(error)) {
      throw Object.assign(
        new Error('Ejecuta la migración notification_preferences en Supabase.'),
        { status: 503 },
      );
    }
    throw error;
  }

  return mapNotificationPreferencesRow(data as PrefsRow);
}
