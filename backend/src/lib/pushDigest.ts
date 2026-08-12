import {
  buildPushDigestPayload,
  type PendingNotificationRow,
} from './pushDigestBuild.js';
import {
  formatMatchLabel,
  mapNotificationCapsule,
  type CapsuleNotificationRow,
} from './notificationCapsule.js';
import { getNotificationPreferences } from './notificationPreferencesStore.js';
import { isWithinPushQuietHours } from './notificationQuietHours.js';
import { supabaseAdmin } from './supabase.js';
import { isPushConfigured, sendPushToUser } from './webPush.js';

export type { DigestNotificationType, PendingNotificationRow } from './pushDigestBuild.js';
export { buildPushDigestPayload, notificationDigestKey } from './pushDigestBuild.js';

/** Espera mínima antes de incluir una alerta en el digest (agrupa ráfagas). */
export const PUSH_DIGEST_MIN_AGE_MS = 5 * 60 * 1000;

function isMissingPushSentColumn(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('push_sent_at') ||
    ((message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist')) &&
      message.includes('push_sent_at'))
  );
}

async function loadActorProfiles(actorIds: string[]): Promise<{
  names: Map<string, string>;
  usernames: Map<string, string>;
}> {
  const names = new Map<string, string>();
  const usernames = new Map<string, string>();
  if (!supabaseAdmin || actorIds.length === 0) return { names, usernames };

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name')
    .in('id', actorIds);

  if (data) {
    for (const p of data) {
      const name = p.full_name?.trim() || (p.username ? `@${p.username}` : 'Alguien');
      names.set(p.id, name);
      const username = p.username?.trim();
      if (username) usernames.set(p.id, username);
    }
  }
  return { names, usernames };
}

async function loadMatchLabels(capsuleIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!supabaseAdmin || capsuleIds.length === 0) return map;

  const { data } = await supabaseAdmin
    .from('capsules')
    .select('id, home_team_name, away_team_name, competition_name, photo_urls')
    .in('id', capsuleIds);

  if (data) {
    for (const row of data as CapsuleNotificationRow[]) {
      const capsule = mapNotificationCapsule(row);
      if (capsule) map.set(capsule.id, formatMatchLabel(capsule));
    }
  }
  return map;
}

async function markPushSent(ids: string[]): Promise<void> {
  if (!supabaseAdmin || ids.length === 0) return;
  await supabaseAdmin
    .from('notifications')
    .update({ push_sent_at: new Date().toISOString() })
    .in('id', ids);
}

async function userHasPushSubscription(userId: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { count } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

async function flushUserPushDigest(
  userId: string,
  cutoffIso: string,
): Promise<{ sent: number; skipped: number; marked: number }> {
  if (!supabaseAdmin) return { sent: 0, skipped: 0, marked: 0 };

  const prefs = await getNotificationPreferences(userId);
  if (isWithinPushQuietHours(prefs.push_quiet)) {
    return { sent: 0, skipped: 1, marked: 0 };
  }

  const { data: pending, error } = await supabaseAdmin
    .from('notifications')
    .select('id, user_id, type, actor_id, capsule_id, body, created_at')
    .eq('user_id', userId)
    .is('push_sent_at', null)
    .lt('created_at', cutoffIso)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingPushSentColumn(error)) return { sent: 0, skipped: 0, marked: 0 };
    throw error;
  }

  const rows = (pending ?? []) as PendingNotificationRow[];
  if (rows.length === 0) return { sent: 0, skipped: 0, marked: 0 };

  const hasSubscription = await userHasPushSubscription(userId);
  if (!hasSubscription) {
    await markPushSent(rows.map((r) => r.id));
    return { sent: 0, skipped: 1, marked: rows.length };
  }

  if (!isPushConfigured()) {
    return { sent: 0, skipped: 1, marked: 0 };
  }

  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  const capsuleIds = [
    ...new Set(rows.map((r) => r.capsule_id).filter((id): id is string => Boolean(id))),
  ];

  const [{ names: actorNames, usernames: actorUsernames }, matchLabels] = await Promise.all([
    loadActorProfiles(actorIds),
    loadMatchLabels(capsuleIds),
  ]);

  const payload = buildPushDigestPayload({
    notifications: rows,
    actorNames,
    actorUsernames,
    matchLabels,
  });
  if (!payload) return { sent: 0, skipped: 1, marked: 0 };

  const result = await sendPushToUser(userId, payload);
  if (result.sent > 0) {
    await markPushSent(rows.map((r) => r.id));
    return { sent: 1, skipped: 0, marked: rows.length };
  }

  return { sent: 0, skipped: 1, marked: 0 };
}

export type FlushPushDigestsResult = {
  users: number;
  sent: number;
  skipped: number;
  marked: number;
};

/** Envía un digest push por usuario con alertas pendientes (cron / intervalo). */
export async function flushPushDigests(options?: {
  minAgeMs?: number;
  now?: Date;
}): Promise<FlushPushDigestsResult> {
  if (!supabaseAdmin) return { users: 0, sent: 0, skipped: 0, marked: 0 };

  const now = options?.now ?? new Date();
  const minAgeMs = options?.minAgeMs ?? PUSH_DIGEST_MIN_AGE_MS;
  const cutoffIso = new Date(now.getTime() - minAgeMs).toISOString();

  const { data: userRows, error } = await supabaseAdmin
    .from('notifications')
    .select('user_id')
    .is('push_sent_at', null)
    .lt('created_at', cutoffIso);

  if (error) {
    if (isMissingPushSentColumn(error)) return { users: 0, sent: 0, skipped: 0, marked: 0 };
    throw error;
  }

  const userIds = [...new Set((userRows ?? []).map((r) => r.user_id as string))];
  let sent = 0;
  let skipped = 0;
  let marked = 0;

  for (const userId of userIds) {
    const result = await flushUserPushDigest(userId, cutoffIso);
    sent += result.sent;
    skipped += result.skipped;
    marked += result.marked;
  }

  return { users: userIds.length, sent, skipped, marked };
}
