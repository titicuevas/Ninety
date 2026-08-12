import { getNotificationPreferences } from './notificationPreferencesStore.js';
import { isWithinPushQuietHours } from './notificationQuietHours.js';
import { supabaseAdmin } from './supabase.js';
import {
  buildWantToGoPushPayload,
  selectWantToGoMatchesDue,
  wantToGoEventKey,
  type WantToGoPushMatch,
} from './wantToGoPushBuild.js';
import { isPushConfigured, sendPushToUser } from './webPush.js';

export type FlushWantToGoPushesResult = {
  users: number;
  sent: number;
  skipped: number;
};

const KIND = 'want_to_go' as const;

function isMissingWantToGoPush(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('push_want_to_go_enabled') ||
    message.includes('want_to_go') ||
    ((message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist') ||
      message.includes('check constraint')) &&
      (message.includes('push_want_to_go') ||
        message.includes('diary_push_sent') ||
        message.includes('want_to_go')))
  );
}

async function userHasPushSubscription(userId: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { count } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

async function loadSentKeys(userId: string): Promise<Set<string> | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('diary_push_sent')
    .select('event_key')
    .eq('user_id', userId)
    .eq('kind', KIND);

  if (error) {
    if (isMissingWantToGoPush(error)) return null;
    throw error;
  }

  return new Set((data ?? []).map((r) => String(r.event_key)));
}

async function markSent(userId: string, eventKeys: string[]): Promise<boolean> {
  if (!supabaseAdmin || eventKeys.length === 0) return true;
  const rows = eventKeys.map((event_key) => ({
    user_id: userId,
    kind: KIND,
    event_key,
    sent_at: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin
    .from('diary_push_sent')
    .upsert(rows, { onConflict: 'user_id,kind,event_key', ignoreDuplicates: true });

  if (error) {
    if (isMissingWantToGoPush(error)) return false;
    throw error;
  }
  return true;
}

async function loadUserWatchlist(userId: string): Promise<WantToGoPushMatch[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('want_to_go_matches')
    .select('match_id, home_team_name, away_team_name, match_played_at, competition_name')
    .eq('user_id', userId)
    .not('match_played_at', 'is', null)
    .order('match_played_at', { ascending: true })
    .limit(100);

  if (error) {
    if (isMissingWantToGoPush(error) || (error.message ?? '').includes('want_to_go_matches')) {
      return [];
    }
    throw error;
  }

  return (data ?? [])
    .filter((row) => typeof row.match_played_at === 'string' && row.match_played_at)
    .map((row) => ({
      match_id: row.match_id as number,
      home_team_name: String(row.home_team_name ?? ''),
      away_team_name: String(row.away_team_name ?? ''),
      match_played_at: String(row.match_played_at),
      competition_name: (row.competition_name as string | null) ?? null,
    }));
}

async function flushUserWantToGoPushes(
  userId: string,
  prefs: Awaited<ReturnType<typeof getNotificationPreferences>>,
  now: Date,
): Promise<{ sent: number; skipped: number }> {
  if (!supabaseAdmin || !prefs.push_want_to_go) {
    return { sent: 0, skipped: 0 };
  }

  if (isWithinPushQuietHours(prefs.push_quiet, now)) {
    return { sent: 0, skipped: 1 };
  }

  const hasSubscription = await userHasPushSubscription(userId);
  if (!hasSubscription || !isPushConfigured()) {
    return { sent: 0, skipped: 1 };
  }

  const sentKeys = await loadSentKeys(userId);
  if (sentKeys == null) {
    return { sent: 0, skipped: 1 };
  }

  const watchlist = await loadUserWatchlist(userId);
  const due = selectWantToGoMatchesDue(watchlist, now, sentKeys);
  if (due.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const timezone = prefs.push_quiet.timezone || 'UTC';
  let sent = 0;
  let skipped = 0;

  for (const match of due) {
    const payload = buildWantToGoPushPayload(match, now, timezone);
    const result = await sendPushToUser(userId, payload);
    if (result.sent > 0) {
      const marked = await markSent(userId, [wantToGoEventKey(match.match_id)]);
      if (marked) sent += 1;
      else skipped += 1;
    } else {
      skipped += 1;
    }
  }

  return { sent, skipped };
}

/**
 * Cron: push opt-in de partidos «Quiero ir» próximos (idempotente; quiet hours).
 */
export async function flushWantToGoPushes(options?: {
  now?: Date;
}): Promise<FlushWantToGoPushesResult> {
  if (!supabaseAdmin) {
    return { users: 0, sent: 0, skipped: 0 };
  }

  const now = options?.now ?? new Date();

  const { data: prefRows, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id')
    .eq('push_want_to_go_enabled', true);

  if (error) {
    if (isMissingWantToGoPush(error)) {
      return { users: 0, sent: 0, skipped: 0 };
    }
    throw error;
  }

  const userIds = [...new Set((prefRows ?? []).map((r) => r.user_id as string))];
  let sent = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const prefs = await getNotificationPreferences(userId);
    const result = await flushUserWantToGoPushes(userId, prefs, now);
    sent += result.sent;
    skipped += result.skipped;
  }

  return { users: userIds.length, sent, skipped };
}
