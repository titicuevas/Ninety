import {
  computeDiaryAnniversary,
  type DiaryAnniversaryCapsule,
} from './diaryAnniversary.js';
import { computeDiaryMilestone, thresholdsToCelebrate } from './diaryMilestone.js';
import {
  anniversaryEventKey,
  buildAnniversaryPushPayload,
  buildMilestonePushPayload,
  localDayKeyInTimeZone,
  localYmdInTimeZone,
  milestoneEventKey,
  type DiaryPushKind,
} from './diaryPushBuild.js';
import { getNotificationPreferences } from './notificationPreferencesStore.js';
import { isWithinPushQuietHours } from './notificationQuietHours.js';
import { supabaseAdmin } from './supabase.js';
import { isPushConfigured, sendPushToUser } from './webPush.js';

export type FlushDiaryPushesResult = {
  users: number;
  anniversarySent: number;
  milestoneSent: number;
  skipped: number;
};

function isMissingDiaryPush(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('diary_push_sent') ||
    message.includes('push_anniversary_enabled') ||
    message.includes('push_milestone_enabled') ||
    ((message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist')) &&
      (message.includes('diary_push') ||
        message.includes('push_anniversary') ||
        message.includes('push_milestone')))
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

async function loadSentKeys(
  userId: string,
  kind: DiaryPushKind,
): Promise<Set<string> | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('diary_push_sent')
    .select('event_key')
    .eq('user_id', userId)
    .eq('kind', kind);

  if (error) {
    if (isMissingDiaryPush(error)) return null;
    throw error;
  }

  return new Set((data ?? []).map((r) => String(r.event_key)));
}

async function markSent(
  userId: string,
  kind: DiaryPushKind,
  eventKeys: string[],
): Promise<boolean> {
  if (!supabaseAdmin || eventKeys.length === 0) return true;
  const rows = eventKeys.map((event_key) => ({
    user_id: userId,
    kind,
    event_key,
    sent_at: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin
    .from('diary_push_sent')
    .upsert(rows, { onConflict: 'user_id,kind,event_key', ignoreDuplicates: true });

  if (error) {
    if (isMissingDiaryPush(error)) return false;
    throw error;
  }
  return true;
}

async function loadUserCapsules(userId: string): Promise<DiaryAnniversaryCapsule[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('capsules')
    .select('id, watched_at, home_team_name, away_team_name, rating, note')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as DiaryAnniversaryCapsule[];
}

async function flushUserDiaryPushes(
  userId: string,
  prefs: Awaited<ReturnType<typeof getNotificationPreferences>>,
  now: Date,
): Promise<{ anniversarySent: number; milestoneSent: number; skipped: number }> {
  if (!supabaseAdmin) return { anniversarySent: 0, milestoneSent: 0, skipped: 0 };

  if (!prefs.push_anniversary && !prefs.push_milestone) {
    return { anniversarySent: 0, milestoneSent: 0, skipped: 0 };
  }

  if (isWithinPushQuietHours(prefs.push_quiet, now)) {
    return { anniversarySent: 0, milestoneSent: 0, skipped: 1 };
  }

  const hasSubscription = await userHasPushSubscription(userId);
  if (!hasSubscription || !isPushConfigured()) {
    return { anniversarySent: 0, milestoneSent: 0, skipped: 1 };
  }

  const capsules = await loadUserCapsules(userId);
  const timezone = prefs.push_quiet.timezone || 'UTC';
  let anniversarySent = 0;
  let milestoneSent = 0;
  let skipped = 0;

  if (prefs.push_anniversary) {
    const dayKey = localDayKeyInTimeZone(now, timezone);
    const sentKeys = await loadSentKeys(userId, 'anniversary');
    if (sentKeys == null) {
      skipped += 1;
    } else if (!sentKeys.has(anniversaryEventKey(dayKey))) {
      const anniversary = computeDiaryAnniversary(capsules, localYmdInTimeZone(now, timezone));
      if (anniversary) {
        const payload = buildAnniversaryPushPayload(anniversary);
        const result = await sendPushToUser(userId, payload);
        if (result.sent > 0) {
          const marked = await markSent(userId, 'anniversary', [anniversaryEventKey(dayKey)]);
          if (marked) anniversarySent += 1;
          else skipped += 1;
        } else {
          skipped += 1;
        }
      }
    }
  }

  if (prefs.push_milestone) {
    const sentKeys = await loadSentKeys(userId, 'milestone');
    if (sentKeys == null) {
      skipped += 1;
    } else {
      const celebrated = [...sentKeys]
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n) && n > 0);
      const milestone = computeDiaryMilestone(capsules.length, celebrated);
      if (milestone) {
        const payload = buildMilestonePushPayload(milestone);
        const result = await sendPushToUser(userId, payload);
        if (result.sent > 0) {
          const keys = thresholdsToCelebrate(milestone.threshold).map(milestoneEventKey);
          const marked = await markSent(userId, 'milestone', keys);
          if (marked) milestoneSent += 1;
          else skipped += 1;
        } else {
          skipped += 1;
        }
      }
    }
  }

  return { anniversarySent, milestoneSent, skipped };
}

/**
 * Cron: push opt-in de aniversarios / hitos (idempotente; respeta quiet hours).
 */
export async function flushDiaryPushes(options?: {
  now?: Date;
}): Promise<FlushDiaryPushesResult> {
  if (!supabaseAdmin) {
    return { users: 0, anniversarySent: 0, milestoneSent: 0, skipped: 0 };
  }

  const now = options?.now ?? new Date();

  const { data: prefRows, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id')
    .or('push_anniversary_enabled.eq.true,push_milestone_enabled.eq.true');

  if (error) {
    if (isMissingDiaryPush(error)) {
      return { users: 0, anniversarySent: 0, milestoneSent: 0, skipped: 0 };
    }
    throw error;
  }

  const userIds = [...new Set((prefRows ?? []).map((r) => r.user_id as string))];
  let anniversarySent = 0;
  let milestoneSent = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const prefs = await getNotificationPreferences(userId);
    const result = await flushUserDiaryPushes(userId, prefs, now);
    anniversarySent += result.anniversarySent;
    milestoneSent += result.milestoneSent;
    skipped += result.skipped;
  }

  return { users: userIds.length, anniversarySent, milestoneSent, skipped };
}
